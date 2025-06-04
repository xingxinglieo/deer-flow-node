import { FastifyInstance, FastifyReply } from 'fastify';
import { graph } from '../graph/builder';
import { State } from '../graph/types';
import { isToolMessage, isAIMessageChunk } from '@langchain/core/messages';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import crypto from 'crypto';
import { ReadableStream } from 'stream/web';

/**
 * 生成唯一 ID
 */
function generateId(): string {
    return crypto.randomUUID();
}

const ContentItemSchema = z.object({
    type: z.string().describe("The type of content (text, image, etc.)"),
    text: z.string().optional().nullable().describe("The text content if type is 'text'"),
    image_url: z.string().optional().nullable().describe("The image URL if type is 'image'")
});

const ChatMessageSchema = z.object({
    role: z.string().describe("The role of the message sender (user or assistant)"),
    content: z.union([
        z.string(),
        z.array(ContentItemSchema)
    ]).describe("The content of the message, either a string or a list of content items")
});

const ChatRequestSchema = z.object({
    messages: z.array(ChatMessageSchema),
    thread_id: z.string().optional().nullable(),
    resources: z.array(z.any()).optional().nullable(),
    max_plan_iterations: z.number().optional().nullable(),
    max_step_num: z.number().optional().nullable(),
    max_search_results: z.number().optional().nullable(),
    auto_accepted_plan: z.boolean().optional().nullable(),
    interrupt_feedback: z.string().optional().nullable(),
    mcp_settings: z.record(z.any()).optional().nullable(),
    enable_background_investigation: z.boolean().optional().nullable(),
})

type ChatRequest = z.infer<typeof ChatRequestSchema>

/**
 * 聊天路由
 * 对应 Python 版本的 /api/chat/stream 接口
 */
export async function chatRoutes(fastify: FastifyInstance) {
    // POST /api/chat/stream - 流式聊天接口
    fastify.withTypeProvider<ZodTypeProvider>().
        post<{ Body: ChatRequest }>('/api/chat/stream', {
            schema: {
                body: ChatRequestSchema,
            }
        }, (request, reply: FastifyReply) => {
            // 设置流式响应头
            reply.header('Content-Type', 'text/event-stream')
                .header('Cache-Control', 'no-cache')
                .send(ReadableStream.from(streamWorkflowGenerator(request.body)))
            // 创建工作流生成器
            // const workflowGenerator = streamWorkflowGenerator(request.body);
            // type a = AsyncGenerator
            // // 发送流式数据
            // for await (const chunk of workflowGenerator) {
            //     console.log(chunk);
            //     reply.send(chunk);
            // }
            // return reply;
        });
}

/**
 * 工作流流式生成器
 * 对应 Python 版本的 _astream_workflow_generator 函数
 */
async function* streamWorkflowGenerator(
    {
        messages,
        thread_id,
        resources,
        max_plan_iterations,
        max_step_num,
        max_search_results,
        // auto_accepted_plan,
        // interrupt_feedback,
        mcp_settings,
        // enable_background_investigation,
    }: ChatRequest
): AsyncGenerator<string, void, unknown> {
    // try {
    // 构建初始状态
    const initialState: State = {
        messages,
        plan_iterations: 0,
        final_report: '',
        current_plan: null,
        observations: [],
        // auto_accepted_plan,
        // enable_background_investigation,
    } as unknown as State;

    // 执行图工作流并处理流式输出
    const stream = await graph.stream(initialState, {
        configurable: {
            thread_id,
            resources: resources || [],
            max_plan_iterations: max_plan_iterations || 3,
            max_step_num: max_step_num || 5,
            max_search_results: max_search_results || 10,
            mcp_settings: mcp_settings || {},
        },
        streamMode: ["updates", "messages"],
        subgraphs: true,
    });

    // 处理流式事件
    for await (const [_, type, [chunk, metadata]] of stream) {
        const eventStreamMessage: Record<string, any> = {
            thread_id,
            id: chunk.id || generateId(),
            agent: metadata.langgraph_node,
            role: "assistant",
            content: chunk.content || '',
        }

        if (chunk.response_metadata?.finish_reason) {
            eventStreamMessage.finish_reason = chunk.response_metadata.finish_reason;
        }

        if (isToolMessage(chunk)) {
            yield makeEvent('tool_call_result', {
                ...eventStreamMessage,
                tool_call_id: chunk.tool_call_id,
            });
        } else if (isAIMessageChunk(chunk)) {
            if (chunk.tool_calls && chunk.tool_calls.length > 0) {
                yield makeEvent('tool_calls', {
                    ...eventStreamMessage,
                    tool_calls: chunk.tool_calls,
                    tool_call_chunks: chunk.tool_call_chunks,
                });
            } else if (chunk.tool_call_chunks && chunk.tool_call_chunks.length > 0) {
                yield makeEvent('tool_call_chunks', {
                    ...eventStreamMessage,
                    tool_call_chunks: chunk.tool_call_chunks,
                });
            } else if (eventStreamMessage.content || eventStreamMessage.finish_reason) {
                yield makeEvent('message_chunk', eventStreamMessage);
            }
        }
    }
    // } catch (error) {
    //     console.error('Workflow generator error:', error);
    //     // 发送错误事件
    //     const errorEvent = makeEvent('message_chunk', {
    //         thread_id: thread_id || 'error',
    //         id: generateId(),
    //         role: 'assistant',
    //         content: `工作流执行出错: ${error instanceof Error ? error.message : '未知错误'}`,
    //         finish_reason: 'error'
    //     });
    //     yield errorEvent;
    // }
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