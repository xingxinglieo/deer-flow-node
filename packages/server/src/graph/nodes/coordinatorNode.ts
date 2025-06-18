import { Command, END } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { tool } from '@langchain/core/tools';
import { State } from '../types';
import { Configuration } from '~/config/configuration';
import { AGENT_LLM_MAP } from '~/config/agents';
import { getLLMByType } from '~/llm/index';
import { applyPromptTemplate } from '~/prompts/template';
import z from 'zod';
import { logger } from '@/utils/logger';

export const handoffToPlanner = tool(
  () => {
    /**
     * Handoff to planner agent to do plan.
     * This tool is not returning anything: we're just using it
     * as a way for LLM to signal that it needs to hand off to planner agent
     */
    return;
  },
  {
    name: 'handoff_to_planner',
    description: 'Handoff to planner agent to do plan.',
    schema: z.object({
      taskTitle: z.string(),
      locale: z.string()
    })
  }
);

export async function coordinatorNode(
  state: State,
  config: RunnableConfig
): Promise<Command<'planner' | 'background_investigator' | '__end__'>> {
  const configurable = Configuration.fromRunnableConfig(config);
  logger.info(configurable.thread_id, 'Coordinator Node: Running', state);
  const messages = applyPromptTemplate('coordinator', state, configurable);
  const response = await getLLMByType(AGENT_LLM_MAP['coordinator']!).bindTools([handoffToPlanner]).invoke(messages);
  logger.info(configurable.thread_id, 'Coordinator Node: llm invoke success', response);
  let goto: 'planner' | 'background_investigator' | typeof END = END;
  let locale = state.locale || 'zh-CN'; // Default locale if not specified

  if (response.tool_calls?.length) {
    goto = 'planner';
    if (state.enable_background_investigation) {
      // 如果启用了背景调查，先进行搜索再进行规划
      goto = 'background_investigator';
    }
    try {
      for (const toolCall of response.tool_calls) {
        if (toolCall.name !== 'handoff_to_planner') {
          continue;
        }
        const toolLocale = toolCall.args?.locale;
        if (toolLocale) {
          locale = toolLocale;
          break;
        }
      }
    } catch (e) {
      console.error(`Error processing tool calls: ${e}`);
    }
  }

  logger.info(configurable.thread_id, `Coordinator Node: Next Node`, {
    goto,
    locale
  });
  return new Command({
    update: { locale, resources: configurable.resources },
    goto
  });
}
