// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

// Define available LLM types
export type LLMType = "basic" | "reasoning" | "vision";

// Define agent-LLM mapping
export const AGENT_LLM_MAP: Record<string, LLMType> = {
  coordinator: "basic",
  planner: "basic",
  researcher: "basic",
  coder: "basic",
  reporter: "basic",
  podcast_script_writer: "basic",
  ppt_composer: "basic",
  prose_writer: "basic",
}; 