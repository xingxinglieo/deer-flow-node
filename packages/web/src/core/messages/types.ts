// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

export type MessageRole = "user" | "assistant" | "tool";

export interface Message {
  id: string;
  thread_id: string;
  agent?:
    | "coordinator"
    | "planner"
    | "researcher"
    | "coder"
    | "reporter"
    | "podcast";
  role: MessageRole;
  is_streaming?: boolean;
  content: string;
  content_chunks: string[];
  tool_calls?: ToolCallRuntime[];
  options?: Option[];
  finish_reason?: "stop" | "interrupt" | "tool_calls";
  interrupt_feedback?: string;
  resources?: Array<Resource>;
}

export interface Option {
  text: string;
  value: string;
}

export interface ToolCallRuntime {
  id: string;
  name: string;
  args: Record<string, unknown>;
  args_chunks?: string[];
  result?: string;
}

export interface Resource {
  uri: string;
  title: string;
}
