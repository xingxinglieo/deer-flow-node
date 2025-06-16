import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径（ES 模块兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 录制对话流程的管理器
 */
export class ReplayRecorder {
  private replayDir: string;
  private activeRecordings: Map<string, RecordingSession> = new Map();

  constructor(replayDir: string) {
    this.replayDir = replayDir;
    this.ensureReplayDir();
  }

  /**
   * 确保录制目录存在
   */
  private async ensureReplayDir() {
    try {
      await fs.mkdir(this.replayDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create replay directory:', error);
    }
  }

  /**
   * 开始录制一个对话会话
   */
  startRecording(threadId: string): RecordingSession {
    // 如果已有活跃的录制会话，先关闭它
    if (this.activeRecordings.has(threadId)) {
      console.log(`Closing existing recording session for thread_id: ${threadId}`);
      const existingSession = this.activeRecordings.get(threadId)!;
      existingSession.close();
      this.activeRecordings.delete(threadId);
    }

    // 创建新的录制会话（会追加到现有文件）
    const session = new RecordingSession(threadId, this.replayDir);
    this.activeRecordings.set(threadId, session);
    console.log(`Started new recording session for thread_id: ${threadId}`);
    return session;
  }

  /**
   * 获取指定线程的录制会话
   */
  getRecording(threadId: string): RecordingSession | undefined {
    return this.activeRecordings.get(threadId);
  }

  /**
   * 停止录制指定的对话会话
   */
  stopRecording(threadId: string): boolean {
    const session = this.activeRecordings.get(threadId);
    if (session) {
      session.close();
      this.activeRecordings.delete(threadId);
      console.log(`Stopped recording for thread_id: ${threadId}`);
      return true;
    }
    return false;
  }
}

/**
 * 单个对话会话的录制器
 */
export class RecordingSession {
  private threadId: string;
  private filePath: string;
  private writeStream: WriteStream | null = null;
  private isClosed: boolean = false;

  constructor(threadId: string, replayDir: string) {
    this.threadId = threadId;
    this.filePath = path.join(replayDir, `${threadId}.txt`);
    this.openFile();
  }

  /**
   * 打开录制文件
   */
  private openFile() {
    try {
      // 使用追加模式打开文件，如果文件不存在则创建
      this.writeStream = createWriteStream(this.filePath, {
        encoding: 'utf8',
        flags: 'a' // 追加模式
      });

      // 添加对话轮次分隔符（如果文件已存在）
      this.addConversationSeparator();

      console.log(`Opened recording file: ${this.filePath}`);
    } catch (error) {
      console.error(`Failed to open recording file ${this.filePath}:`, error);
      throw error;
    }
  }

  /**
   * 添加对话轮次分隔符
   */
  private async addConversationSeparator() {
    try {
      // 检查文件是否已存在且不为空
      const stats = await fs.stat(this.filePath).catch(() => null);
      if (stats && stats.size > 0) {
        // 使用 SSE 事件格式的分隔符，客户端不会识别此事件类型
        const separatorEvent = {
          separator_type: 'conversation_round',
          timestamp: new Date().toISOString(),
          thread_id: this.threadId,
          round_number: Date.now() // 使用时间戳作为轮次标识
        };
        await this.writeEvent('conversation_separator', separatorEvent);
      }
    } catch (error) {
      // 忽略错误，继续录制
      console.warn('Failed to add conversation separator:', error);
    }
  }

  /**
   * 录制用户消息
   */
  async recordUserMessage(content: string, messageId: string) {
    if (this.isClosed) {
      return;
    }

    const eventData = {
      thread_id: this.threadId,
      id: messageId,
      role: 'user',
      content: content,
      finish_reason: 'stop'
    };

    await this.writeEvent('message_chunk', eventData);
  }

  /**
   * 录制 SSE 事件
   */
  async recordSSEEvent(eventType: string, data: Record<string, any>) {
    if (this.isClosed) {
      return;
    }

    await this.writeEvent(eventType, data);
  }

  /**
   * 直接录制 SSE 事件字符串
   */
  async recordRawSSEEvent(sseEventString: string) {
    if (this.isClosed || !this.writeStream) {
      return;
    }

    try {
      // 直接写入原始 SSE 事件字符串
      this.writeStream.write(sseEventString);
    } catch (error) {
      this.close();
      console.error('Failed to write raw SSE event to recording file:', error);
    }
  }

  /**
   * 写入事件到文件
   */
  private async writeEvent(eventType: string, data: Record<string, any>) {
    if (this.isClosed || !this.writeStream) {
      return;
    }

    try {
      // 格式化为 SSE 事件
      const eventLine = `event: ${eventType}\n`;
      const dataLine = `data: ${JSON.stringify(data)}\n\n`;

      this.writeStream.write(eventLine);
      this.writeStream.write(dataLine);
    } catch (error) {
      this.close();
      console.error('Failed to write event to recording file:', error);
    }
  }

  /**
   * 关闭录制会话
   */
  close() {
    this.isClosed = true;
    if (this.writeStream) {
      try {
        this.writeStream.end();
        console.log(`Closed recording file: ${this.filePath}`);
      } catch (error) {
        console.error('Error closing recording file:', error);
      } finally {
        this.writeStream = null;
      }
    }
  }
}

// 全局录制器实例
export const replayRecorder = new ReplayRecorder(path.join(__dirname, '../../../web/public/.replay'));
