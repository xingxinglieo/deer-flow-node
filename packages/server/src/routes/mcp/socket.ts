// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { FastifyInstance } from 'fastify';
import { Socket } from 'socket.io';
import { initializeClientManager, SocketIOClientManager } from './clientManager';

declare module 'fastify' {
  interface FastifyInstance {
    clientManager: SocketIOClientManager;
  }
}

/**
 * Fastify插件：提供WebSocket连接接口
 */
export async function socketRoutes(fastify: FastifyInstance) {
  // 确保已注册WebSocket插件
  await fastify.register(require('@fastify/websocket'));

  // 初始化Socket.IO客户端管理器
  // 可以通过path选项自定义Socket.IO路径
  const clientManager = initializeClientManager(fastify.server, {
    path: '/api/mcp/ws/', // 自定义路径
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  fastify.decorate('clientManager', clientManager);

  const io = clientManager.io;

  io.on('connection', (socket: Socket) => {
    fastify.log.info(`✅ Socket.IO client connected: ${socket.id}`);
    // 发送欢迎消息
    socket.emit('welcome', {
      message: 'Connected to MCP Server',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // 基本的ping/pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  // 服务器关闭时清理资源
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing Socket.IO server...');
    clientManager.close();
  });
}
