import { AIMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { Command } from '@langchain/langgraph';
import { Configuration } from '~/config/configuration';
import { State, PlanSchema, Plan } from '../types';
import { AGENT_LLM_MAP } from '~/config/agents';
import { getLLMByType } from '~/llm/index';
import { applyPromptTemplate } from '~/prompts/template';
import { repairJsonOutput } from '~/utils/json';
import { logger } from '@/utils/logger';
// 规划器节点
export async function plannerNode(state: State, config?: RunnableConfig): Promise<Command> {
  // const planIterations = state.planIterations || 0;
  const configurable = Configuration.fromRunnableConfig(config);
  logger.info(configurable.thread_id, 'Planner Node: Running', {
    state,
    configurable
  });
  const messages = applyPromptTemplate('planner', state, configurable);
  const plan_iterations = state.plan_iterations || 0;

  // 添加背景调查结果到消息中
  if (plan_iterations === 0 && state.enable_background_investigation && state.background_investigation_results) {
    messages.push({
      role: 'user',
      content: `background investigation results of user query:\n${state.background_investigation_results}\n`
    });
  }
  // 如果计划迭代次数超过最大值，返回报告器节点
  if (plan_iterations >= configurable.max_plan_iterations) {
    logger.info(
      configurable.thread_id,
      'Planner Node: Plan iterations exceed max plan iterations, goto reporter node.'
    );
    return new Command({ goto: 'reporter' });
  }

  const llm = getLLMByType(AGENT_LLM_MAP['planner']!).withStructuredOutput(PlanSchema, {
    method: 'jsonSchema'
  });
  logger.info(configurable.thread_id, 'Planner Node: llm generate plan');
  const current_plan = await llm.invoke(messages).catch((e) => {
    logger.error(configurable.thread_id, 'Planner Node: llm generate plan error:', e);
    // 修复 json
    if (e.lc_error_code === 'OUTPUT_PARSING_FAILURE') {
      logger.info(configurable.thread_id, 'Planner Node: llm generate plan output parsing failure, repair json output');
      const repairedContent = repairJsonOutput(e.llmOutput);
      const output = JSON.parse(repairedContent) as Plan;
      const parsed = PlanSchema.safeParse(output);
      let plan: Plan;
      if (parsed.success) {
        plan = parsed.data;
      } else {
        const steps =
          output?.steps
            ?.filter((step) => step.title)
            .map((step) => ({
              title: step.title,
              need_search: step.need_search || true,
              description: step.description || '',
              step_type: step.step_type || 'research',
              execution_res: typeof step.execution_res === 'string' ? step.execution_res : undefined
            })) ?? [];
        plan = {
          title: output.title || 'Deep Research',
          thought: output.thought || '',
          steps,
          // 如果 steps为 空，则直接跳至 reporter 节点
          has_enough_context: output.has_enough_context || steps.length === 0,
          locale: output.locale || 'en-US'
        };
      }
      return plan;
    }
    throw e;
  });
  logger.info(configurable.thread_id, 'Planner Node: llm generate plan success:', current_plan);

  if (current_plan.has_enough_context) {
    logger.info(configurable.thread_id, 'Planner Node: llm generate plan has enough context, goto reporter node.');
    return new Command({
      update: {
        messages: [new AIMessage({ content: JSON.stringify(current_plan), name: 'planner' })],
        current_plan: current_plan
      },
      goto: 'reporter'
    });
  }
  logger.info(
    configurable.thread_id,
    'Planner Node: llm generate plan has not enough context, goto human feedback node.'
  );
  return new Command({
    update: {
      messages: [new AIMessage({ content: JSON.stringify(current_plan), name: 'planner' })],
      current_plan
    },
    goto: 'human_feedback'
  });
}
