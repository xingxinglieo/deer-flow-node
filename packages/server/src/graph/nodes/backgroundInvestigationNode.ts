import { Command } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { Configuration } from '~/config/configuration';
import { State } from '../types';
import { tavilySearch } from '~/tools/tavilySearch';
import { logger } from '@/utils/logger';

/**
 * 背景调查节点
 * 在规划器节点运行前，先进行网络搜索以收集背景信息
 */
export async function backgroundInvestigationNode(state: State, config?: RunnableConfig): Promise<Command> {
  const configurable = Configuration.fromRunnableConfig(config || {});
  logger.info(configurable.thread_id, 'Background investigation Node: Running', state);

  // 确保 messages 有内容
  if (!state.messages.length) {
    logger.info(configurable.thread_id, 'Background investigation Node: No messages, goto planner node.');
    return new Command({ goto: 'planner' });
  }

  // 获取最后一条消息的内容并转换为字符串
  const lastMessage = state.messages[state.messages.length - 1]!;
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

  let backgroundInvestigationResults = null;

  try {
    logger.info(configurable.thread_id, 'Background investigation Node: tavily search');
    // 使用 tavilySearch 工具进行搜索
    const res = await tavilySearch.invoke({
      query,
      searchDepth: 'advanced'
    });
    backgroundInvestigationResults = res.results.map((elem: any) => ({
      title: elem.title,
      content: elem.content
    }));
    logger.info(configurable.thread_id, 'Background investigation Node: tavily search success', {
      backgroundInvestigationResults
    });
  } catch (error) {
    logger.error(configurable.thread_id, 'Background investigation Node: tavily search error:', error);
  }

  logger.info(configurable.thread_id, 'Background investigation Node: end, goto planner node anyway');
  return new Command({
    update: {
      background_investigation_results: JSON.stringify(backgroundInvestigationResults)
    },
    goto: 'planner'
  });
}
