import { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { State } from '~/graph/types';
import { setupAndExecuteAgentStep } from './util';
import { Configuration } from '@/config/configuration';
import { crawlTool, tavilySearch, getRetrieverTool } from '~/tools';
import { logger } from '@/utils/logger';

export async function researcherNode(state: State, config: RunnableConfig): Promise<Command<'research_team'>> {
  const configurable = Configuration.fromRunnableConfig(config);
  logger.info(configurable.thread_id, 'Researcher Node: Running', state);
  const tools: any[] = [tavilySearch, crawlTool];

  // 添加检索器工具
  const retrieverTool = getRetrieverTool(state.resources || []);
  if (retrieverTool) {
    tools.unshift(retrieverTool); // 插入到最前面，优先使用
  }

  logger.info(
    configurable.thread_id,
    'Researcher Node: Tools',
    tools.map((t) => t.name)
  );
  return await setupAndExecuteAgentStep(state, config, 'researcher', tools);
}
