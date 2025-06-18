// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import axios from 'axios';
import { Retriever, Resource, Document, Chunk } from './types';

/**
 * RAGFlow 提供者实现
 * 使用 RAGFlow API 检索文档
 */
export class RAGFlowProvider extends Retriever {
  private apiUrl: string;
  private apiKey: string;
  private pageSize: number = 10;

  constructor() {
    super();
    
    const apiUrl = process.env.RAGFLOW_API_URL;
    if (!apiUrl) {
      throw new Error('RAGFLOW_API_URL is not set');
    }
    this.apiUrl = apiUrl;

    const apiKey = process.env.RAGFLOW_API_KEY;
    if (!apiKey) {
      throw new Error('RAGFLOW_API_KEY is not set');
    }
    this.apiKey = apiKey;

    const pageSize = process.env.RAGFLOW_PAGE_SIZE;
    if (pageSize) {
      this.pageSize = parseInt(pageSize, 10);
    }
  }

  /**
   * 查询相关文档
   */
  async queryRelevantDocuments(
    query: string,
    resources: Resource[] = []
  ): Promise<Document[]> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const datasetIds: string[] = [];
    const documentIds: string[] = [];

    for (const resource of resources) {
      const { datasetId, documentId } = this.parseUri(resource.uri);
      datasetIds.push(datasetId);
      if (documentId) {
        documentIds.push(documentId);
      }
    }

    const payload = {
      question: query,
      dataset_ids: datasetIds,
      document_ids: documentIds,
      page_size: this.pageSize
    };

    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/retrieval`,
        payload,
        { headers, timeout: 30000 }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to query documents: ${response.data}`);
      }

      const result = response.data;
      const data = result.data || {};
      const docAggs = data.doc_aggs || [];

      // 创建文档映射
      const docs: Map<string, Document> = new Map();
      for (const doc of docAggs) {
        const docId = doc.doc_id;
        docs.set(docId, new Document(docId, {
          title: doc.doc_name,
          chunks: []
        }));
      }

      // 添加文档片段
      const chunks = data.chunks || [];
      for (const chunk of chunks) {
        const doc = docs.get(chunk.document_id);
        if (doc) {
          doc.chunks.push(new Chunk(
            chunk.content,
            chunk.similarity
          ));
        }
      }

      return Array.from(docs.values());
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to query documents: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 列出资源
   */
  async listResources(query?: string): Promise<Resource[]> {
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const params: Record<string, string> = {};
    if (query) {
      params.name = query;
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/datasets`,
        { headers, params, timeout: 30000 }
      );

      if (response.status !== 200) {
        throw new Error(`Failed to list resources: ${response.data}`);
      }

      const result = response.data;
      const resources: Resource[] = [];

      const data = result.data || [];
      for (const item of data) {
        resources.push({
          uri: `rag://dataset/${item.id}`,
          title: item.name || '',
          description: item.description || ''
        });
      }

      return resources;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to list resources: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 解析 URI 获取数据集 ID 和文档 ID
   */
  private parseUri(uri: string): { datasetId: string; documentId?: string } {
    try {
      const url = new URL(uri);
      if (url.protocol !== 'rag:') {
        throw new Error(`Invalid URI: ${uri}`);
      }
      
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length < 2 || pathParts[0] !== 'dataset') {
        throw new Error(`Invalid URI format: ${uri}`);
      }
      
      const datasetId = pathParts[1];
      if (!datasetId) {
        throw new Error(`Invalid URI format: missing dataset ID in ${uri}`);
      }
      
      const documentId = url.hash ? url.hash.substring(1) : undefined;
      
      return { datasetId, documentId };
    } catch (error) {
      throw new Error(`Failed to parse URI: ${uri}`);
    }
  }
} 