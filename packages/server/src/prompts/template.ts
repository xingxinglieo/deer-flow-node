// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BaseMessage } from '@langchain/core/messages';
import { Configuration } from '../config/configuration';
import { State, Message } from '../graph/types';
import dayjs from 'dayjs';
// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple template engine for replacing variables in templates
 * Supports Jinja2-like syntax: {{ variable_name }}
 */
class TemplateEngine {
  /**
   * Render template with given variables
   */
  static render(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace all {{ variable }} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const replacement = value !== null && value !== undefined ? String(value) : '';
      result = result.replace(pattern, replacement);
    }
    
    return result;
  }
}

/**
 * Load and return a prompt template
 * 
 * @param promptName - Name of the prompt template file (without .md extension)
 * @returns The template string
 */
export function getPromptTemplate(promptName: string): string {
  try {
    const templatePath = path.join(__dirname, `${promptName}.md`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(`Error loading template ${promptName}: ${error}`);
  }
}

/**
 * Apply template variables to a prompt template and return formatted messages
 * This function replicates the Python version's functionality:
 * 1. Add current time to state variables
 * 2. Merge configurable variables if provided
 * 3. Render template with variables
 * 4. Return system message + existing messages
 * 
 * @param promptName - Name of the prompt template to use
 * @param state - Current agent state containing variables to substitute
 * @param configurable - Optional configuration object
 * @returns List of messages with the system prompt as the first message
 */
export function applyPromptTemplate(
  promptName: string, 
  state: State, 
  configurable?: Configuration
): (Message| BaseMessage)[] {
  try {
    // Convert state to variables for template rendering
    const stateVars: Record<string, any> = {
      CURRENT_TIME: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      ...state,
    };

    // Add configurable variables if provided
    if (configurable) {
      const configurableObj = configurable.toConfigurable();
      Object.assign(stateVars, configurableObj);
    }

    // Load and render template
    const template = getPromptTemplate(promptName);
    const systemPrompt = TemplateEngine.render(template, stateVars);
    
    // Return system message + existing messages
    const messages: (Message| BaseMessage)[] = [{ role: 'system', content: systemPrompt }];
    
    // Add existing messages from state, converting BaseMessage to simple format
    if (state.messages && Array.isArray(state.messages)) {
      messages.push(...state.messages);
    }
    
    return messages;
  } catch (error) {
    throw new Error(`Error applying template ${promptName}: ${error}`);
  }
}