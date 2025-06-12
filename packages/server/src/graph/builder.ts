// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT
import { MemorySaver } from "@langchain/langgraph";
import { buildBaseGraph } from "./nodes";



export function buildGraphWithMemory() {
  /**
   * 构建并返回带有内存的代理工作流图
   */
  // 使用持久内存保存对话历史
  // TODO: 兼容 SQLite / PostgreSQL
  const memory = new MemorySaver();

  // 构建状态图
  const builder = buildBaseGraph();
  return builder.compile({ checkpointer: memory });
}

export function buildGraph() {
  /**
   * 构建并返回不带内存的代理工作流图
   */
  // 构建状态图
  const builder = buildBaseGraph();
  return builder.compile();
}

// 导出默认图实例
export const graph = buildGraphWithMemory(); 