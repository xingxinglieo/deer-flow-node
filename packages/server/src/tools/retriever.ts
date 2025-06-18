// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { buildRetriever } from '../rag';
import type { Retriever, Resource, Document } from '../rag';

/**
 * 检索器工具输入模式
 */
const RetrieverInputSchema = z.object({
  keywords: z.string().describe('search keywords to look up')
});

/**
 * 检索器工具类
 */
class RetrieverTool {
  private retriever: Retriever;
  private resources: Resource[];

  constructor(retriever: Retriever, resources: Resource[]) {
    this.retriever = retriever;
    this.resources = resources;
  }

  /**
   * 执行检索
   */
  async run(keywords: string): Promise<Record<string, any>[] | string> {
    console.info(`Retriever tool query: ${keywords}`, { resources: this.resources });
    
    try {
      const documents = await this.retriever.queryRelevantDocuments(keywords, this.resources);
      
      if (!documents || documents.length === 0) {
        return 'No results found from the local knowledge base.';
      }
      
      return documents.map(doc => doc.toDict());
    } catch (error) {
      console.error('Retriever tool error:', error);
      throw new Error(`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * 创建检索器工具
 */
export function getRetrieverTool(resources: Resource[]) {
  if (!resources || resources.length === 0) {
    return null;
  }

  const selectedRAGProvider = process.env.RAG_PROVIDER;
  console.info(`create retriever tool: ${selectedRAGProvider}`);
  
  const retriever = buildRetriever();
  if (!retriever) {
    return null;
  }

  const retrieverTool = new RetrieverTool(retriever, resources);

  return tool(
    async ({ keywords }) => {
      return await retrieverTool.run(keywords);
    },
    {
      name: 'local_search_tool',
      description: 'Useful for retrieving information from the file with `rag://` uri prefix, it should be higher priority than the web search or writing code. Input should be a search keywords.',
      schema: RetrieverInputSchema
    }
  );
} 