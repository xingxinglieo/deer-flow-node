import { Command } from '@langchain/langgraph';
import { State, StepType } from '../types';
import { logger } from '@/utils/logger';
import { Configuration } from '@/config/configuration';
import { RunnableConfig } from '@langchain/core/runnables';

export function researchTeamNode(state: State, config: RunnableConfig): Command<'planner' | 'researcher' | 'coder'> {
  // Research team node that collaborates on tasks
  const configurable = Configuration.fromRunnableConfig(config);
  logger.info(configurable.thread_id, 'Research Team Node: Running', state);

  const currentPlan = state.current_plan;
  if (!currentPlan || !currentPlan.steps) {
    logger.info(configurable.thread_id, 'Research Team Node: No steps in current plan, goto planner node.');
    return new Command({ goto: 'planner' });
  }

  let currentStep;
  for (const step of currentPlan.steps) {
    if (!step.execution_res) {
      currentStep = step;
      break;
    }
  }

  if (currentStep?.step_type === StepType.RESEARCH) {
    logger.info(configurable.thread_id, 'Research Team Node: Research step, goto researcher node.', {
      currentStep
    });
    return new Command({ goto: 'researcher' });
  }

  if (currentStep?.step_type === StepType.PROCESSING) {
    logger.info(configurable.thread_id, 'Research Team Node: Processing step, goto coder node.', {
      currentStep
    });
    return new Command({ goto: 'coder' });
  }

  logger.info(configurable.thread_id, 'Research Team Node: All steps are executed, goto planner node.');
  return new Command({ goto: 'planner' });
}
