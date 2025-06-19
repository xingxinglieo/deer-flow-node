// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';
import { BaseMessage } from '@langchain/core/messages';
import { Configuration } from '../config/configuration';
import { State, Message } from '../graph/types';
import dayjs from 'dayjs';
// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


/**
 * 加载并返回一个 prompt 模板
 *
 * @param promptName - prompt 模板文件名（不含 .md 扩展名）
 * @returns 模板字符串
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
 * 应用模板变量到 prompt 模板并返回格式化的消息
 *
 * @param promptName - 要使用的 prompt 模板名称
 * @param state - 包含要替换变量的当前代理状态
 * @param configurable - 可选的配置对象
 * @returns 包含系统 prompt 作为第一条消息的消息列表
 */
export function applyPromptTemplate(
  promptName: string,
  state: State,
  configurable?: Configuration
): (Message | BaseMessage)[] {
  try {
    // 将状态转换为模板渲染的变量
    const stateVars: Record<string, any> = {
      CURRENT_TIME: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      ...state
    };

    // 如果提供了可配置变量，则添加它们
    if (configurable) {
      Object.assign(stateVars, configurable);
    }

    // 加载模板内容
    const template = getPromptTemplate(promptName);
    
    // 使用 Nunjucks 渲染模板
    const systemPrompt = nunjucks.renderString(template, stateVars);

    // 返回系统消息 + 现有消息
    const messages: (Message | BaseMessage)[] = [{ role: 'system', content: systemPrompt }];

    // 从状态添加现有消息，将 BaseMessage 转换为简单格式
    if (state.messages && Array.isArray(state.messages)) {
      messages.push(...state.messages);
    }

    return messages;
  } catch (error) {
    throw new Error(`Error applying template ${promptName}: ${error}`);
  }
}
