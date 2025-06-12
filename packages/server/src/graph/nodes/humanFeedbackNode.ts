import { interrupt } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { Command } from '@langchain/langgraph';
import { State, PlanSchema } from '../types';
// 人工反馈节点
export async function humanFeedbackNode(
  state: State
): Promise<Command<'planner' | 'research_team' | 'reporter' | '__end__'>> {
  const current_plan = state.current_plan;
  // check if the plan is auto accepted
  const autoAcceptedPlan = state.auto_accepted_plan;

  if (!autoAcceptedPlan) {
    // 注意返回不是 promise 的，不能 await
    // 🛑 执行到这里时，interrupt 会：
    // 1. 抛出一个特殊的 "中断异常"
    // 2. LangGraph 捕获这个异常
    // 3. 暂停图的执行
    // 4. 保存当前状态到 checkpointer
    // 5. 返回中断信息给用户
    // 6. 等待用户交互后调用接口
    // 7. 接口调用 Command({ resume: "[EDIT_PLAN/ACCEPTED]" })
    // 8. langgraph 二次执行此节点，interrupt 不再中断且会返回 resume 的值
    const feedback = interrupt('Please Review the Plan.');

    // if the feedback is not accepted, return the planner node
    if (feedback && String(feedback).toUpperCase().startsWith('[EDIT_PLAN]')) {
      return new Command({
        update: {
          messages: [new HumanMessage({ content: feedback, name: 'feedback' })]
        },
        goto: 'planner'
      });
    } else if (feedback && String(feedback).toUpperCase().startsWith('[ACCEPTED]')) {
      console.info('Plan is accepted by user.');
    } else {
      throw new TypeError(`Interrupt value of ${feedback} is not supported.`);
    }
  }

  // if the plan is accepted, run the following node
  let plan_iterations = state.plan_iterations;
  let goto = 'research_team';

  // increment the plan iterations
  plan_iterations += 1;
  // parse the plan
  if (current_plan?.has_enough_context) {
    goto = 'reporter';
  }

  return new Command({
    update: {
      current_plan: PlanSchema.parse(current_plan),
      plan_iterations,
      locale: current_plan?.locale
    },
    goto
  });
}
