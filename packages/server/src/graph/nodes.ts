// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { Command, interrupt } from "@langchain/langgraph";
import { z } from "zod";
import { Configuration } from "../config/configuration";
import { State, Plan, Resource, PlanSchema } from "./types";
import { AGENT_LLM_MAP } from "../config/agents";
import { getLLMByType } from "../llm/index";
import { applyPromptTemplate } from "../prompts/template";

// 工具定义
export const handoffToPlannerTool = tool(
  async ({ taskTitle, locale }: { taskTitle: string; locale: string }) => {
    // 这个工具不返回任何内容：我们只是用它作为LLM信号需要移交给规划器代理的方式
    return "Handoff to planner";
  },
  {
    name: "handoff_to_planner",
    description: "Handoff to planner agent to do plan.",
    schema: z.object({
      taskTitle: z.string().describe("The title of the task to be handed off."),
      locale: z.string().describe("The user's detected language locale (e.g., en-US, zh-CN)."),
    }),
  }
);

// 背景调查节点
// export async function backgroundInvestigationNode(
//   state: State,
//   config?: RunnableConfig
// ): Promise<Command> {
//   console.log("Background investigation node is running.");
  
//   const lastMessage = state.messages[state.messages.length - 1];
//   const query = (lastMessage?.content as string) || "";
  
//   // 模拟搜索结果
//   const backgroundInvestigationResults = [
//     {
//       title: "Sample Search Result",
//       content: `Background investigation for: ${query}`,
//     },
//   ];

//   return new Command({
//     update: {
//       background_investigation_results: JSON.stringify(backgroundInvestigationResults),
//     },
//     goto: "planner",
//   });
// }

// 规划器节点
export async function plannerNode(
  state: State,
  config?: RunnableConfig
): Promise<Command> {
  console.log("Planner generating full plan");
  
  // const planIterations = state.planIterations || 0;
  const configurable = Configuration.fromRunnableConfig(config);
  const messages = applyPromptTemplate("planner", state, configurable)

  // 如果计划迭代次数超过最大值，返回报告器节点
  // if (planIterations >= configurable.maxPlanIterations) {
  //   return new Command({ goto: "reporter" });
  // }

  const llm = getLLMByType(AGENT_LLM_MAP["planner"]!).withStructuredOutput(PlanSchema);
  const currentPlan = await llm.invoke(messages);
  console.log(currentPlan);
//   return new Command({
//     update={
//         "messages": [AIMessage(content=full_response, name="planner")],
//         "current_plan": new_plan,
//     },
//     goto="reporter",
// )
  console.info("Planner response has enough context.")
  return new Command({
    update: {
      messages: [new AIMessage({ content: JSON.stringify(currentPlan), name: "planner" })],
      current_plan: currentPlan,
    },
    goto: "reporter",
  });
}

// // 人工反馈节点
// export async function humanFeedbackNode(state: State): Promise<Command> {
//   const currentPlan = state.current_plan || "";
//   const autoAcceptedPlan = state.auto_accepted_plan || false;

//   if (!autoAcceptedPlan) {
//     const feedback = await interrupt("Please Review the Plan.");

//     // 如果反馈不被接受，返回规划器节点
//     if (feedback && String(feedback).toUpperCase().startsWith("[EDIT_PLAN]")) {
//       return new Command({
//         update: {
//           messages: [new HumanMessage({ content: feedback as string, name: "feedback" })],
//         },
//         goto: "planner",
//       });
//     } else if (feedback && String(feedback).toUpperCase().startsWith("[ACCEPTED]")) {
//       console.log("Plan is accepted by user.");
//     } else {
//       throw new Error(`Interrupt value of ${feedback} is not supported.`);
//     }
//   }

//   // 如果计划被接受，运行下一个节点
//   let planIterations = state.plan_iterations || 0;
//   let goto = "research_team";

//   try {
//     planIterations += 1;
//     const newPlan = JSON.parse(currentPlan as string);
//     if (newPlan.has_enough_context) {
//       goto = "reporter";
//     }
//   } catch (error) {
//     console.warn("Planner response is not a valid JSON");
//     if (planIterations > 0) {
//       return new Command({ goto: "reporter" });
//     } else {
//       return new Command({ goto: "__end__" });
//     }
//   }

//   return new Command({
//     update: {
//       plan_iterations: planIterations,
//     },
//     goto,
//   });
// }

// 协调器节点
// export async function coordinatorNode(
//   state: State,
//   config?: RunnableConfig
// ): Promise<Command> {
//   console.log("Coordinator node is running.");
  
//   // const enableBackgroundInvestigation = state.enable_background_investigation;
  
//   // if (enableBackgroundInvestigation) {
//   //   return new Command({ goto: "background_investigation" });
//   // }
  
//   return new Command({ goto: "planner" });
// }

// 报告器节点
export async function reporterNode(state: State): Promise<Command> {
  console.log("Reporter node is running.");
  
  const finalReport = "This is the final report based on the research and analysis.";
  
  return new Command({
    update: {
      final_report: finalReport,
      messages: [new AIMessage({ content: finalReport, name: "reporter" })],
    },
    goto: "__end__",
  });
}

// // 研究团队节点
// export async function researchTeamNode(state: State): Promise<Command> {
//   console.log("Research team node is running.");
  
//   // 模拟研究团队的工作
//   const observations = [
//     "Research observation 1",
//     "Research observation 2",
//   ];
  
//   return new Command({
//     update: {
//       observations: [...state.observations, ...observations],
//     },
//     goto: "planner",
//   });
// }

// // 研究员节点
// export async function researcherNode(
//   state: State,
//   config?: RunnableConfig
// ): Promise<Command> {
//   console.log("Researcher node is running.");
  
//   // 模拟研究员的工作
//   const researchResults = "Research results from researcher agent.";
  
//   return new Command({
//     update: {
//       messages: [new AIMessage({ content: researchResults, name: "researcher" })],
//     },
//     goto: "research_team",
//   });
// }

// // 编码器节点
// export async function coderNode(
//   state: State,
//   config?: RunnableConfig
// ): Promise<Command> {
//   console.log("Coder node is running.");
  
//   // 模拟编码器的工作
//   const codeResults = "Code analysis and implementation results.";
  
//   return new Command({
//     update: {
//       messages: [new AIMessage({ content: codeResults, name: "coder" })],
//     },
//     goto: "research_team",
//   });
// } 