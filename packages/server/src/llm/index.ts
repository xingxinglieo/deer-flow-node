// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { ChatOpenAI } from '@langchain/openai';
import { LLMType } from '../config/agents';

// Cache for LLM instances
const _llmCache: Map<LLMType, ChatOpenAI> = new Map();

/**
 * Get LLM instance by type. Returns cached instance if available.
 * Simplified version for demo purposes.
 */
export function getLLMByType(llmType: LLMType): ChatOpenAI {
  // Return cached instance if available
  if (_llmCache.has(llmType)) {
    return _llmCache.get(llmType)!;
  }
  
  // Create a basic ChatOpenAI instance
  // In production, this would load from configuration
  const  llm = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    configuration: {
      
      baseURL: process.env.OPENAI_BASE_URL || '',
    },
  });
  
  // Cache the instance
  _llmCache.set(llmType, llm);
  
  return llm;
} 