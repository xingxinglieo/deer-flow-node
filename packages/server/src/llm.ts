// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { ChatOpenAI, ChatOpenAIFields } from '@langchain/openai';
import { LLMType } from './config/agents';

// Get current directory for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Cache for LLM instances
const _llmCache: Map<LLMType, ChatOpenAI> = new Map();

/**
 * LLM configuration interface
 */
// interface LLMConfig {
//   base_url?: string;
//   model?: string;
//   api_key?: string;
//   temperature?: number;
//   max_tokens?: number;
//   [key: string]: any;
// }

/**
 * Configuration file structure
 */
// interface Config {
//   BASIC_MODEL?: LLMConfig;
//   REASONING_MODEL?: LLMConfig;
//   VISION_MODEL?: LLMConfig;
//   [key: string]: any;
// }

/**
 * Get LLM configuration from environment variables
 * Environment variables should follow the format: {LLM_TYPE}_MODEL__{KEY}
 * e.g., BASIC_MODEL__api_key, BASIC_MODEL__base_url
 */
// function getEnvLLMConf(llmType: string): Record<string, any> {
//   const prefix = `${llmType.toUpperCase()}_MODEL__`;
//   const conf: Record<string, any> = {};
  
//   for (const [key, value] of Object.entries(process.env)) {
//     if (key.startsWith(prefix)) {
//       const confKey = key.slice(prefix.length).toLowerCase();
//       conf[confKey] = value;
//     }
//   }
  
//   return conf;
// }

/**
 * Load YAML configuration file
 */
// function loadYamlConfig(filePath: string): Config {
//   try {
//     if (!fs.existsSync(filePath)) {
//       console.warn(`Configuration file not found: ${filePath}`);
//       return {};
//     }
    
//     const fileContent = fs.readFileSync(filePath, 'utf-8');
//     const config = yaml.load(fileContent) as Config;
//     return config || {};
//   } catch (error) {
//     console.error(`Error loading configuration file: ${error}`);
//     return {};
//   }
// }

/**
 * Create LLM instance using configuration
 */
function createLLMUseConf(llmType: LLMType): ChatOpenAI {
  // const llmTypeMap: Record<LLMType, LLMConfig | undefined> = {
    // reasoning: conf.REASONING_MODEL,
    // basic: conf.BASIC_MODEL,
    // vision: conf.VISION_MODEL,
  // };
  
  // const llmConf = llmTypeMap[llmType];
  // if (!llmConf || typeof llmConf !== 'object') {
    // throw new Error(`Invalid LLM Conf: ${llmType}`);
  // }
  
  // Get configuration from environment variables
  // const envConf = getEnvLLMConf(llmType);
  
  // Merge configurations, with environment variables taking precedence
  // const mergedConf = { ...llmConf, ...envConf };
  
  // if (!mergedConf || Object.keys(mergedConf).length === 0) {
  //   throw new Error(`Unknown LLM Conf: ${llmType}`);
  // }
  
  // Convert configuration to ChatOpenAI format
  const openaiConfig:ChatOpenAIFields  = {
    model: process.env.OPENAI_MODEL || '',
    apiKey: process.env.OPENAI_API_KEY || '',
    configuration: {
      baseURL: process.env.OPENAI_BASE_URL || '',
    },
  };
  
  return new ChatOpenAI(openaiConfig);
}

/**
 * Get LLM instance by type. Returns cached instance if available.
 * This function replicates the Python version's functionality:
 * 1. Check cache first
 * 2. Load configuration from YAML file
 * 3. Merge with environment variables
 * 4. Create and cache LLM instance
 */
export function getLLMByType(llmType: LLMType): ChatOpenAI {
  // Return cached instance if available
  if (_llmCache.has(llmType)) {
    return _llmCache.get(llmType)!;
  }
  
  // Load configuration file
  // const conf = loadYamlConfig(configPath);
  
  // Create LLM instance
  const llm = createLLMUseConf(llmType);
  
  // Cache the instance
  _llmCache.set(llmType, llm);
  
  return llm;
}

/**
 * Clear LLM cache (useful for testing)
 */
// export function clearLLMCache(): void {
//   _llmCache.clear();
// }

/**
 * Get cached LLM types
 */
// export function getCachedLLMTypes(): LLMType[] {
//   return Array.from(_llmCache.keys());
// }

/**
 * Check if LLM type is cached
 */
// export function isLLMCached(llmType: LLMType): boolean {
//   return _llmCache.has(llmType);
// } 