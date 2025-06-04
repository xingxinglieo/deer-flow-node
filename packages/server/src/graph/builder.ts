// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { StateGraph, MemorySaver, START, END } from "@langchain/langgraph";

import { StateAnnotation } from "./types";
import {
  plannerNode,
  reporterNode,
} from "./nodes";

function buildBaseGraph() {
  /**
   * 构建并返回包含所有节点和边的基础状态图
   */
  const builder = new StateGraph(StateAnnotation);

  // 添加所有节点
  builder
    // .addNode("coordinator", coordinatorNode)
    // builder.addNode("background_investigator", backgroundInvestigationNode);
    .addNode("planner", plannerNode, {
      ends: ["reporter"],
    })
    .addNode("reporter", reporterNode)
    // builder.addNode("research_team", researchTeamNode);
    // builder.addNode("researcher", researcherNode);
    // builder.addNode("coder", coderNode);
    // builder.addNode("human_feedback", humanFeedbackNode);
    // 设置入口点
    .addEdge(START, "planner")
    // 设置结束点
    .addEdge("reporter", END);

  return builder;
}

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