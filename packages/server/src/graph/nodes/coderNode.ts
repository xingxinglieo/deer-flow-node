import { Command } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { State } from '../types';
import { setupAndExecuteAgentStep } from './util';
import { executeJSCode } from '~/tools';
import { Configuration } from '@/config/configuration';
import { logger } from '@/utils/logger';

export function coderNode(state: State, config: RunnableConfig): Promise<Command<'research_team'>> {
  const configurable = Configuration.fromRunnableConfig(config);
  logger.info(configurable.thread_id, 'Coder Node: Running', state);
  // Coder node that do code analysis
  return setupAndExecuteAgentStep(state, config, 'coder', [executeJSCode]);
}
