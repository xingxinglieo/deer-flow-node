// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  MCPServerMetadataRequest,
  MCPServerMetadataRequestSchema,
  MCPServerMetadataResponse,
  MCPServerMetadataResponseSchema
} from './types.js';
import { loadMCPTools } from './utils.js';

/**
 * MCP相关路由
 */
export async function mcpRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/mcp/server/metadata - 获取MCP服务器信息
   * 对应Python版本的mcp_server_metadata接口
   */
  fastify.withTypeProvider<ZodTypeProvider>().post<{
    Body: MCPServerMetadataRequest;
  }>(
    '/api/mcp/server/metadata',
    {
      schema: {
        body: MCPServerMetadataRequestSchema,
        response: {
          200: MCPServerMetadataResponseSchema
        }
      }
    },
    async (request: FastifyRequest<{ Body: MCPServerMetadataRequest }>, reply: FastifyReply) => {
      try {
        console.info('Getting MCP server metadata', {
          transport: request.body.transport,
          url: request.body.url
        });

        const timeout = request.body.timeout_seconds ?? 300;

        // 检查transport类型
        if (request.body.transport !== 'sse' && request.body.transport !== 'client_local') {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Only SSE and client_local transport types are supported'
          });
        }

        // 使用工具函数从MCP服务器加载工具
        const tools = await loadMCPTools({
          serverType: request.body.transport,
          url: request.body.url,
          // socketId: request.body.socket_id,
          timeoutSeconds: timeout
        });

        // 创建响应
        const response: MCPServerMetadataResponse = {
          transport: request.body.transport,
          url: request.body.url,
          tools
        };

        return reply.code(200).send(response);
      } catch (error) {
        console.error('Error in MCP server metadata endpoint:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // 根据错误类型返回适当的HTTP状态码
        if (error instanceof Error) {
          if (error.message.includes('required for stdio type') || error.message.includes('required for sse type')) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message
            });
          }

          if (error.message.includes('Unsupported server type')) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message
            });
          }
        }

        // 默认500错误
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
    }
  );
}
