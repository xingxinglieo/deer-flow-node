// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { WebSocketClientTransport } from '@modelcontextprotocol/sdk/client/websocket.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { clientManager } from './clientManager';

/**
 * 从客户端会话获取工具的辅助函数
 */
async function getToolsFromClientSession(client: Client, timeoutSeconds: number = 10): Promise<Tool[]> {
  try {
    // 设置超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);
    });

    // 列出可用工具
    const result = await Promise.race([client.listTools(), timeoutPromise]);

    return result.tools || [];
  } catch (error) {
    console.error('Error getting tools from client session:', error);
    throw error;
  }
}

/**
 * 加载工具
 */
export async function loadMCPTools(options: {
  serverType: 'sse' | 'client_local';
  url?: string;
  timeoutSeconds?: number;
  socketId?: string;
  clientTools?: {
    name: string;
    description: string;
    input_schema: {
      type: string;
      properties: Record<string, any>;
    };
  }[];
}): Promise<Tool[]> {
  const { serverType, url, timeoutSeconds = 60 } = options;

  try {
    const client = new Client(
      {
        name: 'deer-flow-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    // if (serverType === 'client_local') {
    // 返回客户端提供的工具，每个工具添加 client_local: 前缀
    // return clientTools.map(
    //   (toolName) =>
    //     ({
    //       name: `client_local:${toolName}`,
    //       description: `Client-side tool: ${toolName}`,
    //       inputSchema: {
    //         type: 'object',
    //         properties: {},
    //         additionalProperties: true
    //       }
    //     }) as Tool
    // );
    // } else
    if (serverType === 'sse') {
      if (!url) {
        throw new Error('URL is required for sse type');
      }
      // 创建SSE传输
      const transport = new SSEClientTransport(new URL(url));
      await client.connect(transport);
    } else {
      throw new Error(`Unsupported server type: ${serverType}`);
    }
    const tools = await getToolsFromClientSession(client!, timeoutSeconds).finally(() => {
      client.close();
    });
    return tools;
  } catch (error) {
    console.error(`Error loading MCP tools: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * 执行MCP工具调用
 */
export async function callMCPTool(options: {
  serverType: 'sse' | 'client_local';
  url?: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  timeoutSeconds?: number;
  clientId?: string;
}): Promise<any> {
  const { serverType, url, toolName, toolArgs, timeoutSeconds = 30, clientId } = options;

  try {
    // if (serverType === 'client_local') {
    //   if (!clientId) {
    //     throw new Error('Client ID is required for client_local type');
    //   }

    //   // 处理 client_local: 前缀
    //   const actualToolName = toolName.startsWith('client_local:')
    //     ? toolName.substring('client_local:'.length)
    //     : toolName;

    //   // 调用客户端工具
    //   return await clientManager.callClientTool(clientId, actualToolName, toolArgs, timeoutSeconds * 1000);
    // }

    let client: Client;

    if (serverType === 'sse') {
      if (!url) {
        throw new Error('URL is required for sse type');
      }

      const transport = new SSEClientTransport(new URL(url));

      client = new Client(
        {
          name: 'deer-flow-client',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {}
          }
        }
      );

      await client.connect(transport);
    } else {
      throw new Error(`Unsupported server type: ${serverType}`);
    }

    // 设置超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool call timeout after ${timeoutSeconds} seconds`));
      }, timeoutSeconds * 1000);
    });

    // 调用工具
    const result = await Promise.race([
      client.callTool({
        name: toolName,
        arguments: toolArgs
      }),
      timeoutPromise
    ]).finally(() => {
      client.close();
    });
    return result;
  } catch (error) {
    console.error(`Error calling MCP tool: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
