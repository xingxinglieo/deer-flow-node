import { Command } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { Configuration } from '~/config/configuration';
import { State } from '../types';
import { tavilySearch } from '~/tools/tavilySearch';

/**
 * 背景调查节点
 * 在规划器节点运行前，先进行网络搜索以收集背景信息
 */
export async function backgroundInvestigationNode(state: State, config?: RunnableConfig): Promise<Command> {
  console.info('Background investigation node is running.');

  const configurable = Configuration.fromRunnableConfig(config || {});

  // 确保 messages 有内容
  if (!state.messages.length) {
    return new Command({ goto: 'planner' });
  }

  // 获取最后一条消息的内容并转换为字符串
  const lastMessage = state.messages[state.messages.length - 1]!;
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

  let backgroundInvestigationResults = null;

  try {
    // 使用 tavilySearch 工具进行搜索
    const resStr = await tavilySearch.invoke({
      query,
      searchDepth: 'advanced'
    });
    const results = JSON.parse(resStr);

    backgroundInvestigationResults = results.map((elem: any) => ({
      title: elem.title,
      content: elem.content
    }));
  } catch (error) {
    console.error(`Error during background investigation: ${error}`);
  }

  return new Command({
    update: {
      background_investigation_results: JSON.stringify(backgroundInvestigationResults)
    },
    goto: 'planner'
  });
}
