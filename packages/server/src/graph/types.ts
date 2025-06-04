// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

export interface Resource {
  uri: string;
  title: string;
  content?: string;
}

export const PlanSchema = z.object({
  title: z.string(),
  thought: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    type: z.string().optional().nullable(),
  })),
  // hasEnoughContext: z.boolean(),
});

export type Plan = z.infer<typeof PlanSchema>;

export interface Message {
  role: string;
  content: string;
  [key: string]: any;
}

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  locale: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "zh-CN",
  }),
  observations: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  resources: Annotation<Resource[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  plan_iterations: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  current_plan: Annotation<Plan | string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  final_report: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  auto_accepted_plan: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  enable_background_investigation: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => true,
  }),
  background_investigation_results: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
}); 

export type State = typeof StateAnnotation.State;