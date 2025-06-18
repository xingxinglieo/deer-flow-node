// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { FastifyInstance } from 'fastify';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 日志接口
interface LogContext {
  threadId?: string;
  [key: string]: any;
}

// 全局日志管理器
class ThreadLogger {
  private fastify?: FastifyInstance;

  // 初始化 Fastify 实例
  init(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  // 通用日志方法
  private log(threadId: string, level: LogLevel, message: string, extra?: any) {
    if (!this.fastify) {
      console.log(`[${level.toUpperCase()}] ${message}`, extra);
      return;
    }

    const logContext: LogContext = {
      threadId,
      ...extra
    };

    // 使用 Fastify 的日志系统
    switch (level) {
      case LogLevel.DEBUG:
        this.fastify.log.debug(logContext, message);
        break;
      case LogLevel.INFO:
        this.fastify.log.info(logContext, message);
        break;
      case LogLevel.WARN:
        this.fastify.log.warn(logContext, message);
        break;
      case LogLevel.ERROR:
        this.fastify.log.error(logContext, message);
        break;
    }
  }

  // 便捷方法
  debug(threadId: string, message: string, extra?: any) {
    this.log(threadId, LogLevel.DEBUG, message, extra);
  }

  info(threadId: string, message: string, extra?: any) {
    this.log(threadId, LogLevel.INFO, message, extra);
  }

  warn(threadId: string, message: string, extra?: any) {
    this.log(threadId, LogLevel.WARN, message, extra);
  }

  error(threadId: string, message: string, extra?: any) {
    this.log(threadId, LogLevel.ERROR, message, extra);
  }
}

// 创建全局实例
export const logger = new ThreadLogger();

// Fastify 插件：自动注入 thread_id
export async function threadLoggerPlugin(fastify: FastifyInstance) {
  // 初始化日志器
  logger.init(fastify);

  fastify.addHook('onRequest', async (request, reply) => {
    const body = request.body as Record<string, any>;
    const threadId = body?.thread_id;

    // 记录请求开始
    logger.info(threadId, `Request started: ${request.method} ${request.url}`, {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent']
    });
  });

  // 添加响应钩子
  fastify.addHook('onResponse', async (request, reply) => {
    const body = request.body as Record<string, any>;
    const threadId = body?.thread_id;
    logger.info(threadId, `Request completed: ${request.method} ${request.url}`, {
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    });
  });

  // 添加错误钩子
  fastify.addHook('onError', async (request, reply, error) => {
    const body = request.body as Record<string, any>;
    const threadId = body?.thread_id;
    logger.error(threadId, `Request error: ${request.method} ${request.url}`, {
      error: error.message,
      stack: error.stack,
      statusCode: reply.statusCode
    });
  });
}
