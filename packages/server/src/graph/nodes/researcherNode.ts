import { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { State } from '~/graph/types';
import { setupAndExecuteAgentStep } from './util';
import { Configuration } from '@/config/configuration';
import { crawlTool, tavilySearch, getRetrieverTool } from '~/tools';

export async function researcherNode(state: State, config: RunnableConfig): Promise<Command<'research_team'>> {
  // Researcher node that do research
  console.info('Researcher node is researching.');
  const configurable = Configuration.fromRunnableConfig(config);
  const tools: any[] = [tavilySearch, crawlTool];
  
  // 添加检索器工具
  const retrieverTool = getRetrieverTool(state.resources || []);
  if (retrieverTool) {
    tools.unshift(retrieverTool); // 插入到最前面，优先使用
  }
  
  console.info(`Researcher tools: ${tools.map((t) => t.name)}`);
  return await setupAndExecuteAgentStep(state, config, 'researcher', tools);
}
