// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * 文档片段，包含内容和相似度分数
 */
export class Chunk {
  content: string;
  similarity: number;

  constructor(content: string, similarity: number) {
    this.content = content;
    this.similarity = similarity;
  }
}

/**
 * 文档对象，包含 ID、URL、标题和多个 chunks
 */
export class Document {
  id: string;
  url?: string;
  title?: string;
  chunks: Chunk[] = [];

  constructor(
    id: string,
    options: {
      url?: string;
      title?: string;
      chunks?: Chunk[];
    } = {}
  ) {
    this.id = id;
    this.url = options.url;
    this.title = options.title;
    this.chunks = options.chunks || [];
  }

  /**
   * 转换为字典格式，用于序列化
   */
  toDict(): Record<string, any> {
    const result: Record<string, any> = {
      id: this.id,
      content: this.chunks.map(chunk => chunk.content).join('\n\n')
    };

    if (this.url) {
      result.url = this.url;
    }
    if (this.title) {
      result.title = this.title;
    }

    return result;
  }
}

/**
 * 资源描述，包含 URI、标题和描述
 */
export interface Resource {
  /** 资源的 URI */
  uri: string;
  /** 资源的标题 */
  title: string;
  /** 资源的描述 */
  description?: string;
}

/**
 * RAG 提供者抽象接口
 */
export abstract class Retriever {
  /**
   * 列出 RAG 提供者的资源
   * @param query 可选的查询字符串
   * @returns 资源列表
   */
  abstract listResources(query?: string): Promise<Resource[]>;

  /**
   * 从资源中查询相关文档
   * @param query 查询字符串
   * @param resources 资源列表
   * @returns 文档列表
   */
  abstract queryRelevantDocuments(
    query: string,
    resources?: Resource[]
  ): Promise<Document[]>;
} 