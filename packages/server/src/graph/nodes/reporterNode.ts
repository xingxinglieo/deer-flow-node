import { HumanMessage } from '@langchain/core/messages';
import { Configuration } from '~/config/configuration';
import { State } from '../types';
import { AGENT_LLM_MAP } from '~/config/agents';
import { getLLMByType } from '~/llm/index';
import { applyPromptTemplate } from '~/prompts/template';

// 报告器节点
export const reporterNode = async (state: State) => {
  console.info('Reporter write final report');
  const currentPlan = state.current_plan;
  const input = {
    ...state,
    messages: [
      new HumanMessage(
        `# Research Requirements\n\n## Task\n\n${currentPlan?.title}\n\n## Description\n\n${currentPlan?.thought}`
      )
    ]
  };
  const invokeMessages = await applyPromptTemplate('reporter', input);
  const observations = state.observations;

  // Add a reminder about the new report format, citation style, and table usage
  invokeMessages.push(
    new HumanMessage({
      content:
        "IMPORTANT: Structure your report according to the format in the prompt. Remember to include:\n\n1. Key Points - A bulleted list of the most important findings\n2. Overview - A brief introduction to the topic\n3. Detailed Analysis - Organized into logical sections\n4. Survey Note (optional) - For more comprehensive reports\n5. Key Citations - List all references at the end\n\nFor citations, DO NOT include inline citations in the text. Instead, place all citations in the 'Key Citations' section at the end using the format: `- [Source Title](URL)`. Include an empty line between each citation for better readability.\n\nPRIORITIZE USING MARKDOWN TABLES for data presentation and comparison. Use tables whenever presenting comparative data, statistics, features, or options. Structure tables with clear headers and aligned columns. Example table format:\n\n| Feature | Description | Pros | Cons |\n|---------|-------------|------|------|\n| Feature 1 | Description 1 | Pros 1 | Cons 1 |\n| Feature 2 | Description 2 | Pros 2 | Cons 2 |",
      name: 'system'
    })
  );

  for (const observation of observations) {
    invokeMessages.push(
      new HumanMessage({
        content: `Below are some observations for the research task:\n\n${observation}`,
        name: 'observation'
      })
    );
  }
  console.debug(`Current invoke messages: ${invokeMessages}`);
  const response = await getLLMByType(AGENT_LLM_MAP['reporter']!).invoke(invokeMessages);
  const responseContent = response.content;
  console.info(`reporter response: ${responseContent}`);

  return { final_report: responseContent };
};
