// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { RunnableConfig } from '@langchain/core/runnables';
import { Resource } from '../graph/types';

/**
 * Configuration class that holds configurable fields for the research workflow
 */
export class Configuration {
  /** Resources to be used for the research */
  public resources: Resource[] = [];

  /** Maximum number of plan iterations */
  public max_plan_iterations: number = 1;

  /** Maximum number of steps in a plan */
  public max_step_num: number = 3;

  /** Maximum number of search results */
  public max_search_results: number = 3;

  public thread_id: string = '';

  /** MCP settings, including dynamic loaded tools */
  public mcp_settings: {
    servers?: Record<
      string,
      {
        url?: string;
        enabled_tools?: string[];
        add_to_agents?: string[];
      }
    >;
  } | null = null;

  constructor(options: Partial<Configuration> = {}) {
    Object.assign(this, options);
  }

  /**
   * Create a Configuration instance from a RunnableConfig
   */
  static fromRunnableConfig(config?: RunnableConfig): Configuration {
    const configurable = config?.configurable || {};

    // Map environment variables and configurable values to field names
    const fieldMappings = [
      { camelCase: 'resources' },
      { camelCase: 'max_plan_iterations' },
      { camelCase: 'max_step_num' },
      { camelCase: 'max_search_results' },
      { camelCase: 'mcp_settings' }
    ];

    const values: Partial<Configuration> = {};

    fieldMappings.forEach(({ camelCase }) => {
      // Get value from environment variable or configurable
      let value = configurable[camelCase];

      // Parse JSON strings for complex types
      if (typeof value === 'string') {
        try {
          // Try to parse as JSON for arrays/objects
          if (['max_plan_iterations', 'max_step_num', 'max_search_results'].includes(camelCase)) {
            value = parseInt(value, 10);
          } else if (value.startsWith('{') || value.startsWith('[')) {
            value = JSON.parse(value);
          }
        } catch {
          // Keep as string if JSON parsing fails
        }
      }

      if (value !== undefined && value !== null) {
        (values as any)[camelCase] = value;
      }
    });

    return new Configuration(values);
  }
  /**
   * Convert this configuration to a plain object for use in graph configurable
   */
  toConfigurable(): Record<string, any> {
    return {
      resources: this.resources,
      max_plan_iterations: this.max_plan_iterations,
      max_step_num: this.max_step_num,
      max_search_results: this.max_search_results,
      mcp_settings: this.mcp_settings,
      thread_id: this.thread_id
    };
  }
}
