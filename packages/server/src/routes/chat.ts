import { FastifyInstance, FastifyReply } from 'fastify';
import { graph } from '../graph/builder';
import { isAIMessageChunk } from '@langchain/core/messages';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { ReadableStream } from 'stream/web';
import { Command } from '@langchain/langgraph';
import { replayRecorder } from '../utils/replay-recorder';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

const ContentItemSchema = z.object({
  type: z.string().describe('The type of content (text, image, etc.)'),
  text: z.string().optional().nullable().describe("The text content if type is 'text'"),
  image_url: z.string().optional().nullable().describe("The image URL if type is 'image'")
});

const ChatMessageSchema = z.object({
  role: z.string().describe('The role of the message sender (user or assistant)'),
  content: z
    .union([z.string(), z.array(ContentItemSchema)])
    .describe('The content of the message, either a string or a list of content items')
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  thread_id: z.string(),
  resources: z.array(z.any()).optional().nullable(),
  max_plan_iterations: z.number().optional().nullable(),
  max_step_num: z.number().optional().nullable(),
  max_search_results: z.number().optional().nullable(),
  auto_accepted_plan: z.boolean().optional().nullable(),
  interrupt_feedback: z.string().optional().nullable(),
  mcp_settings: z.record(z.any()).optional().nullable(),
  enable_background_investigation: z.boolean().optional().nullable()
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * 聊天路由
 * 对应 Python 版本的 /api/chat/stream 接口
 */
export async function chatRoutes(fastify: FastifyInstance) {
  // POST /api/chat/stream - 流式聊天接口
  fastify.withTypeProvider<ZodTypeProvider>().post<{ Body: ChatRequest }>(
    '/api/chat/stream',
    {
      schema: {
        body: ChatRequestSchema
      }
    },
    (request, reply: FastifyReply) => {
      // 设置流式响应头
      reply
        .header('Content-Type', 'text/event-stream')
        .header('Cache-Control', 'no-cache')
        .send(ReadableStream.from(recordingStreamWrapper(request.body)));
    }
  );
}

/**
 * 录制流包装器 - 统一处理录制逻辑
 */
async function* recordingStreamWrapper(requestBody: ChatRequest): AsyncGenerator<string, void, unknown> {
  // 开始录制
  const threadId = requestBody.thread_id || generateId();
  const recordingSession = replayRecorder.startRecording(threadId);

  try {
    // 录制用户消息（取最后一条用户消息）
    const lastUserMessage = requestBody.messages[requestBody.messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await recordingSession.recordUserMessage(lastUserMessage.content as string, generateId());
    }

    // 获取原始流并处理每个事件
    const originalStream = streamWorkflowGenerator({
      ...requestBody,
      thread_id: threadId
    });

    for await (const sseEvent of originalStream) {
      // 直接录制原始 SSE 事件字符串
      await recordingSession.recordRawSSEEvent(sseEvent);
      
      // 转发事件给客户端
      yield sseEvent;
    }
  } catch (error) {
    console.error('Error in recording stream wrapper:', error);
    throw error;
  } finally {
    // 完成后停止录制
    replayRecorder.stopRecording(threadId);
  }
}

/**
 * 工作流流式生成器
 * 对应 Python 版本的 _astream_workflow_generator 函数
 */
async function* streamWorkflowGenerator({
  messages,
  thread_id,
  resources,
  max_plan_iterations,
  max_step_num,
  max_search_results,
  auto_accepted_plan,
  interrupt_feedback,
  mcp_settings,
  enable_background_investigation
}: ChatRequest): AsyncGenerator<string, void, unknown> {
  // 构建初始状态
  let input: any = {
    messages,
    plan_iterations: 0,
    final_report: '',
    current_plan: null,
    observations: [],
    auto_accepted_plan,
    enable_background_investigation
  };

  if (!auto_accepted_plan && interrupt_feedback) {
    // 恢复从上一次中断的地方继续
    input = new Command({ resume: `[${interrupt_feedback}] ${messages[messages.length - 1]?.content ?? ''}` });
  }

  // 执行图工作流并处理流式输出
  const stream = await graph.streamEvents(input, {
    configurable: {
      thread_id,
      resources: resources || [],
      max_plan_iterations: max_plan_iterations || 3,
      max_step_num: max_step_num || 5,
      max_search_results: max_search_results || 10,
      mcp_settings: mcp_settings || {}
    },
    version: 'v2',
    subgraphs: true
  });

  // 处理流式事件
  for await (const args of stream) {
    // const [_, type, info] = args;
    const { event, data, metadata, name, tags, run_id } = args;
    const agent = metadata.checkpoint_ns?.split(':')?.[0] ?? name;
    console.log(event);

    if (event === 'on_chain_stream') {
      const { chunk } = data;
      if (Array.isArray(chunk) && '__interrupt__' in (chunk[1] ?? {})) {
        const interruptInfo = chunk[1]['__interrupt__'][0];
        yield makeEvent('interrupt', {
          thread_id,
          id: interruptInfo.ns[0],
          role: 'assistant',
          content: interruptInfo.value,
          finish_reason: 'interrupt',
          options: [
            { text: 'Edit plan', value: 'edit_plan' },
            { text: 'Start research', value: 'accepted' }
          ]
        });
        continue;
      }
    } else if (event === 'on_chat_model_stream') {
      const { chunk } = data;
      const eventStreamMessage: Record<string, any> = {
        thread_id,
        id: chunk.id || generateId(),
        agent,
        role: 'assistant',
        content: chunk.content || ''
      };

      if (isAIMessageChunk(chunk)) {
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          yield makeEvent('tool_calls', {
            ...eventStreamMessage,
            tool_calls: chunk.tool_calls,
            tool_call_chunks: chunk.tool_call_chunks
          });
        } else if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
          yield makeEvent('tool_call_chunks', {
            ...eventStreamMessage,
            tool_call_chunks: chunk.tool_call_chunks
          });
        } else if (eventStreamMessage.content || eventStreamMessage.finish_reason) {
          yield makeEvent('message_chunk', eventStreamMessage);
        }
      }
    } else if (event === 'on_chat_model_end') {
      const { output: chunk } = data;
      yield makeEvent('message_chunk', {
        thread_id,
        id: chunk.id,
        agent: metadata.langgraph_node,
        role: 'assistant',
        content: '',
        finish_reason: 'stop'
      });
    } else if (event === 'on_tool_start') {
      console.log(args);
    } else if (event === 'on_tool_end') {
      const chunk = data.output;
      if (chunk.tool_call_id) {
        yield makeEvent('tool_call_result', {
          thread_id,
          id: chunk.id || generateId(),
          agent,
          role: 'assistant',
          content: chunk.content || '',
          tool_call_id: chunk.tool_call_id
        });
      }
    }
  }
}

/**
 * 创建 Server-Sent Events 格式的事件数据
 * 对应 Python 版本的 _make_event 函数
 */
function makeEvent(eventType: string, data: any): string {
  // 移除空的 content 字段（与 Python 版本保持一致）
  const cleanData = { ...data } as any;
  if (cleanData.content === '') {
    delete cleanData.content;
  }

  // 格式化为 SSE 事件，使用 ensure_ascii=false 以支持非 ASCII 字符
  return `event: ${eventType}\ndata: ${JSON.stringify(cleanData)}\n\n`;
}
