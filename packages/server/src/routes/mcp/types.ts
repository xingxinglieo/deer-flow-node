// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { z } from 'zod';

/**
 * MCP服务器元数据请求模型
 */
export const MCPServerMetadataRequestSchema = z.object({
  /** MCP服务器连接类型 */
  transport: z.enum(['sse', 'client_local']).describe('The type of MCP server connection tdio or s(sse, client_local)'),
  /** SSE服务器的URL (用于sse类型) */
  url: z.string().optional().describe('The URL of the SSE server (for sse type)'),
  /** 操作的可选自定义超时时间(秒) */
  timeout_seconds: z.number().optional().describe('Optional custom timeout in seconds for the operation'),
  /** 客户端提供的工具列表 (用于client_local类型) */
  // client_tools: z
  //   .array(
  //     z.object({
  //       name: z.string().describe('The name of the tool'),
  //       description: z.string().describe('The description of the tool'),
  //       input_schema: z
  //         .object({
  //           type: z.string().describe('The type of the input schema'),
  //           properties: z.record(z.any()).describe('The properties of the input schema')
  //         })
  //         .optional()
  //         .describe('The input schema of the tool')
  //     })
  //   )
  //   .optional()
  //   .describe('List of tooprovided by client (for client_local type)'),
  // /** 客户端WebSocket连接ID */
  // socket_id: z.string().optional().describe('Client WebSocket connection ID (for client_local type)')
});

export type MCPServerMetadataRequest = z.infer<typeof MCPServerMetadataRequestSchema>;

/**
 * MCP服务器元数据响应模型
 */
export const MCPServerMetadataResponseSchema = z.object({
  /** MCP服务器连接类型 */
  // transport: z.enum(['sse', 'client_local']).describe('The type of MCP server connection (sse, client_local)'),
  /** 从MCP服务器获取的可用工具 */
  tools: z.array(z.any()).default([]).describe('Available tools from the MCP server')
});

export type MCPServerMetadataResponse = z.infer<typeof MCPServerMetadataResponseSchema>;
