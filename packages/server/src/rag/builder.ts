// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Retriever } from './types';
import { RAGFlowProvider } from './ragflow';

/**
 * RAG 提供者枚举
 */
export enum RAGProvider {
  RAGFLOW = 'ragflow'
}

/**
 * 构建检索器实例
 * @returns 检索器实例或 null
 */
export function buildRetriever(): Retriever | null {
  const selectedRAGProvider = process.env.RAG_PROVIDER;

  if (selectedRAGProvider === RAGProvider.RAGFLOW) {
    return new RAGFlowProvider();
  } else if (selectedRAGProvider) {
    throw new Error(`Unsupported RAG provider: ${selectedRAGProvider}`);
  }

  return null;
} 