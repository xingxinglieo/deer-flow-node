// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { Annotation, messagesStateReducer, START } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';

export interface Resource {
  uri: string;
  title: string;
  content?: string;
}

export enum StepType {
  RESEARCH = 'research',
  PROCESSING = 'processing'
}

export const StepTypechema = z.union([z.literal('research'), z.literal('processing')]);

export const StepSchema = z.object({
  need_search: z.boolean().describe('Must be explicitly set for each step'),
  title: z.string(),
  description: z.string().describe('Specify exactly what data to collect'),
  step_type: StepTypechema.describe('Indicates the nature of the step'),
  execution_res: z
    .string()
    .optional()
    // .nullable()
    .describe('The Step execution result')
});

export type Step = z.infer<typeof StepSchema>;

export const PlanSchema = z.object({
  has_enough_context: z.boolean(),
  title: z.string(),
  thought: z.string(),
  steps: z.array(StepSchema).describe('Research & Processing steps to get more context'),
  locale: z.string().describe("e.g. 'en-US' or 'zh-CN', based on the user's language")
}).describe(`examlple:
  {
  title: "AI Market Research Plan",
  thought: "To understand the current market trends in AI, we need to gather comprehensive information.",
  steps: [
    {
      need_search: true,
      title: "Current AI Market Analysis",
      description: "Collect data on market size, growth rates, major players, and investment trends in AI sector.",
      step_type: "research"
    }
  ],
  locale: "zh-CN",
  has_enough_context: false,
}`);

export type Plan = z.infer<typeof PlanSchema>;

export interface Message {
  role: string;
  content: string;
  [key: string]: any;
}

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => []
  }),
  locale: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'zh-CN'
  }),
  observations: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  resources: Annotation<Resource[]>({
    reducer: (x, y) => y ?? x,
    default: () => []
  }),
  plan_iterations: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  current_plan: Annotation<Plan | null>({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  final_report: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => ''
  }),
  auto_accepted_plan: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false
  }),
  enable_background_investigation: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => true
  }),
  background_investigation_results: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null
  }),
  currentNodeName: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => START
  })
});

export type State = typeof StateAnnotation.State;
