// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

/**
 * RAG 提供者枚举
 */
export enum RAGProvider {
  RAGFLOW = 'ragflow'
}

/**
 * 获取选中的 RAG 提供者
 */
export const SELECTED_RAG_PROVIDER = process.env.RAG_PROVIDER;

/**
 * RAG 配置
 */
export const RAG_CONFIG = {
  RAGFLOW_API_URL: process.env.RAGFLOW_API_URL,
  RAGFLOW_API_KEY: process.env.RAGFLOW_API_KEY,
  RAGFLOW_PAGE_SIZE: process.env.RAGFLOW_PAGE_SIZE ? parseInt(process.env.RAGFLOW_PAGE_SIZE, 10) : 10
}; 