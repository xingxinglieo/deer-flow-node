// export * from "./plannerNode";
// export * from "./reporterNode";
// export * from "./humanFeedbackNode";
import { StateGraph, START, END } from '@langchain/langgraph';
import { StateAnnotation } from '../types';
import { plannerNode } from './plannerNode';
import { reporterNode } from './reporterNode';
import { humanFeedbackNode } from './humanFeedbackNode';
import { coordinatorNode } from './coordinatorNode';
import { researchTeamNode } from './researchTeam';
import { coderNode } from './coderNode';
import { researcherNode } from './researcherNode';
import { backgroundInvestigationNode } from './backgroundInvestigationNode';

export function buildBaseGraph() {
  /**
   * 构建并返回包含所有节点和边的基础状态图
   */
  const builder = new StateGraph(StateAnnotation);

  // 添加所有节点
  builder
    .addNode('coordinator', coordinatorNode, {
      ends: ['planner', 'background_investigator', 'human_feedback', END]
    })
    .addNode('background_investigator', backgroundInvestigationNode, {
      ends: ['planner']
    })
    .addNode('planner', plannerNode, {
      ends: ['reporter', 'human_feedback']
    })
    .addNode('human_feedback', humanFeedbackNode, {
      ends: ['planner', 'research_team', 'reporter', END]
    })
    .addNode('research_team', researchTeamNode, {
      ends: ['researcher', 'coder', 'planner']
    })
    .addNode('researcher', researcherNode, {
      ends: ['research_team']
    })
    .addNode('coder', coderNode, {
      ends: ['research_team']
    })
    .addNode('reporter', reporterNode)
    // 设置入口点
    .addEdge(START, 'coordinator')
    // 设置结束点
    .addEdge('reporter', END);

  return builder;
}
