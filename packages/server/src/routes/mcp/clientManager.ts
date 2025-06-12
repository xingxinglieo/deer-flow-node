// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

/**
 * 客户端连接信息
 */
export interface ClientConnection {
  id: string;
  socket: Socket;
  tools: string[];
  connectedAt: Date;
  lastActiveAt: Date;
}

/**
 * 工具调用请求
 */
export interface ToolCallRequest {
  requestId: string;
  tool: string;
  args: Record<string, any>;
}

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  requestId: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Socket.IO 客户端管理器
 * 管理 Socket.IO 连接和工具调用
 */
export class SocketIOClientManager {
  io: SocketIOServer;
  private clients = new Map<string, ClientConnection>();
  private pendingCalls = new Map<
    string,
    {
      resolve: (result: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(server: HttpServer, options: any = {}) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 45000,
      pingInterval: 30000,
      ...options
    });

    this.setupEventHandlers();
  }

  /**
   * 设置Socket.IO事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.info(`Socket connected: ${socket.id}`);

      // 等待客户端注册工具
      // socket.on('register_tools', (tools: string[]) => {
      //   this.registerClient(socket, tools);
      // });

      // 处理工具调用结果
      socket.on('tool_result', (result: ToolCallResult) => {
        this.handleToolResult(result);
      });

      // 处理断开连接
      socket.on('disconnect', (reason: string) => {
        console.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        this.unregisterClient(socket.id);
      });

      // 处理错误
      socket.on('error', (error: Error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // 更新活跃时间（任何消息都更新）
      socket.onAny(() => {
        const client = this.clients.get(socket.id);
        if (client) {
          client.lastActiveAt = new Date();
        }
      });
    });
  }

  /**
   * 注册客户端连接
   */
  private registerClient(socket: Socket, tools: string[]): void {
    const now = new Date();

    // 清理旧连接（如果存在）
    const existing = this.clients.get(socket.id);
    if (existing) {
      existing.socket.disconnect();
    }

    const client: ClientConnection = {
      id: socket.id,
      socket,
      tools,
      connectedAt: now,
      lastActiveAt: now
    };

    this.clients.set(socket.id, client);

    console.info(`Client registered: ${socket.id}`, { tools });
  }

  /**
   * 注销客户端
   */
  unregisterClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.socket.disconnect();
      this.clients.delete(id);
      console.info(`Client unregistered: ${id}`);
    }

    // 清理该客户端的待处理调用
    const toRemoveCalls: string[] = [];
    this.pendingCalls.forEach((call, requestId) => {
      if (requestId.startsWith(id + ':')) {
        clearTimeout(call.timeout);
        call.reject(new Error('Client disconnected'));
        toRemoveCalls.push(requestId);
        this.pendingCalls.delete(requestId);
      }
    });
  }

  /**
   * 获取客户端
   */
  getClient(id: string): ClientConnection | undefined {
    return this.clients.get(id);
  }

  /**
   * 调用客户端工具
   */
  async callClientTool(
    clientId: string,
    toolName: string,
    args: Record<string, any>,
    timeoutMs: number = 30000
  ): Promise<any> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }

    if (!client.tools.includes(toolName)) {
      throw new Error(`Client ${clientId} does not support tool: ${toolName}`);
    }

    const requestId = `${clientId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    // 发送工具调用请求
    const request: ToolCallRequest = {
      requestId,
      tool: toolName,
      args
    };

    client.socket.emit('tool_call', request);

    // 等待响应
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(requestId);
        reject(new Error(`Tool call timeout: ${toolName}`));
      }, timeoutMs);

      this.pendingCalls.set(requestId, {
        resolve,
        reject,
        timeout
      });
    });
  }

  /**
   * 处理工具调用结果
   */
  private handleToolResult(result: ToolCallResult): void {
    const pendingCall = this.pendingCalls.get(result.requestId);
    if (!pendingCall) {
      console.warn(`Received result for unknown request: ${result.requestId}`);
      return;
    }

    clearTimeout(pendingCall.timeout);
    this.pendingCalls.delete(result.requestId);

    if (result.success) {
      pendingCall.resolve(result.result);
    } else {
      pendingCall.reject(new Error(result.error || 'Tool call failed'));
    }
  }

  /**
   * 获取所有客户端
   */
  getAllClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * 清理非活跃连接
   */
  cleanupInactiveClients(inactiveThresholdMs: number = 5 * 60 * 1000): void {
    const now = new Date();
    const toRemove: string[] = [];

    this.clients.forEach((client, id) => {
      const inactiveTime = now.getTime() - client.lastActiveAt.getTime();
      if (inactiveTime > inactiveThresholdMs) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => this.unregisterClient(id));

    if (toRemove.length > 0) {
      console.info(`Cleaned up ${toRemove.length} inactive clients`);
    }
  }

  /**
   * 关闭服务器
   */
  close(): void {
    this.io.close();
  }
}

// 单例实例
let clientManager: SocketIOClientManager;

/**
 * 初始化客户端管理器
 */
export function initializeClientManager(server: HttpServer, options: any = {}): SocketIOClientManager {
  if (clientManager) {
    clientManager.close();
  }

  clientManager = new SocketIOClientManager(server, options);

  // 定期清理非活跃客户端
  setInterval(() => {
    clientManager?.cleanupInactiveClients();
  }, 60 * 1000); // 每分钟检查一次

  return clientManager;
}

// 为了向后兼容，导出一个默认实例
export { clientManager };
