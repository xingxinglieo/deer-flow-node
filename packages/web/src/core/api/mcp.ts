// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import type { SimpleMCPServerMetadata } from "../mcp";

import { resolveServiceURL } from "./resolve-service-url";

/**
 * MCP服务器元数据请求类型
 */
export interface MCPServerMetadataRequest {
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  timeout_seconds?: number;
}

/**
 * MCP服务器元数据响应类型
 */
export interface MCPServerMetadataResponse {
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  tools: any[];
}

/**
 * 查询MCP服务器元数据
 * 对应Python版本的queryMCPServerMetadata函数
 */
export async function queryMCPServerMetadata(config: SimpleMCPServerMetadata): Promise<MCPServerMetadataResponse> {
  const requestBody: MCPServerMetadataRequest = {
    transport: 'command' in config ? 'stdio' : 'sse',
    ...(('command' in config) ? {
      command: config.command,
      args: config.args,
      env: config.env,
    } : {
      url: config.url,
      env: config.env,
    })
  };

  const response = await fetch(resolveServiceURL("mcp/server/metadata"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return response.json();
}

/**
 * 调用MCP工具
 */
export async function callMCPTool(
  config: SimpleMCPServerMetadata,
  toolName: string,
  toolArgs: Record<string, unknown> = {}
): Promise<any> {
  const requestBody = {
    transport: 'command' in config ? 'stdio' : 'sse',
    ...(('command' in config) ? {
      command: config.command,
      args: config.args,
      env: config.env,
    } : {
      url: config.url,
      env: config.env,
    }),
    toolName,
    toolArgs
  };

  const response = await fetch(resolveServiceURL("mcp/tool/call"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }

  return response.json();
}
