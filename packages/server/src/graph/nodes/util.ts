import { Command, Pregel } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { State } from '../types';
import { Configuration } from '../../config/configuration';
import { applyPromptTemplate } from '@/prompts/template';
import { AGENT_LLM_MAP } from '@/config/agents';
import { getLLMByType } from '@/llm/index';

export async function setupAndExecuteAgentStep(
  state: State,
  config: RunnableConfig,
  agentType: string,
  defaultTools: any[]
): Promise<Command<'research_team'>> {
  /**
   * Helper function to set up an agent with appropriate tools and execute a step.
   *
   * This function handles the common logic for both researcher_node and coder_node:
   * 1. Configures MCP servers and tools based on agent type
   * 2. Creates an agent with the appropriate tools or uses the default agent
   * 3. Executes the agent on the current step
   *
   * @param state - The current state
   * @param config - The runnable config
   * @param agentType - The type of agent ("researcher" or "coder")
   * @param defaultTools - The default tools to add to the agent
   * @returns Command to update state and go to research_team
   */
  const configurable = Configuration.fromRunnableConfig(config);
  const mcpServers: Record<string, any> = {};
  const enabledTools: Record<string, string> = {};

  // Extract MCP server configuration for this agent type
  // if (configurable.mcpSettings) {
  //     for (const [serverName, serverConfig] of Object.entries(configurable.mcpSettings.servers)) {
  //         if (
  //             serverConfig.enabledTools &&
  //             serverConfig.addToAgents.includes(agentType)
  //         ) {
  //             mcpServers[serverName] = Object.fromEntries(
  //                 Object.entries(serverConfig).filter(([k]) =>
  //                     ["transport", "command", "args", "url", "env"].includes(k)
  //                 )
  //             );
  //             for (const toolName of serverConfig.enabledTools) {
  //                 enabledTools[toolName] = serverName;
  //             }
  //         }
  //     }
  // }

  // Create and execute agent with MCP tools if available
  // if (Object.keys(mcpServers).length > 0) {
  //     const client = new MultiServerMCPClient(mcpServers);
  //     const loadedTools = [...defaultTools];
  //     for (const tool of client.getTools()) {
  //         if (tool.name in enabledTools) {
  //             tool.description = `Powered by '${enabledTools[tool.name]}'.\n${tool.description}`;
  //             loadedTools.push(tool);
  //         }
  //     }
  //     const agent = createAgent(agentType, agentType, loadedTools, agentType);
  //     return await _executeAgentStep(state, agent, agentType);
  // } else {
  // Use default tools if no MCP servers are configured
  const agent = createAgent(agentType, agentType, defaultTools, agentType);
  return await executeAgentStep(state, agent, agentType);
  // }
}

function createAgent(agentName: string, agentType: string, tools: any[], promptTemplate: string): any {
  /**
   * Factory function to create agents with consistent configuration.
   */
  return createReactAgent({
    name: agentName,
    llm: getLLMByType(AGENT_LLM_MAP[agentType]!),
    tools: tools,
    prompt: (state: any) => applyPromptTemplate(promptTemplate, state)
  });
}

async function executeAgentStep(
  state: State,
  agent: Pregel<any, any>,
  agentName: string
): Promise<Command<'research_team'>> {
  // Helper function to execute a step using the specified agent
  const currentPlan = state.current_plan;
  const observations = state.observations || [];

  // Find the first unexecuted step using functional programming
  const allSteps = currentPlan?.steps || [];
  const currentStep = allSteps.find((step) => !step.execution_res);
  const completedSteps = allSteps.filter((step) => step.execution_res);

  if (!currentStep) {
    console.warn('No unexecuted step found');
    return new Command({ goto: 'research_team' });
  }

  console.info(`Executing step: ${currentStep.title}, agent: ${agentName}`);

  // Format completed steps information
  const completedStepsInfo =
    completedSteps.length > 0
      ? completedSteps.reduce((acc, step, i) => {
          return (
            acc + `## Existing Finding ${i + 1}: ${step.title}\n\n` + `<finding>\n${step.execution_res}\n</finding>\n\n`
          );
        }, '# Existing Research Findings\n\n')
      : '';

  // Prepare the input for the agent with completed steps info
  const agentInput = [
    new HumanMessage({
      content: `${completedStepsInfo}# Current Task\n\n## Title\n\n${currentStep.title}\n\n## Description\n\n${currentStep.description}\n\n## Locale\n\n${state.locale || 'en-US'}`
    })
  ];

  // Add citation reminder for researcher agent
  if (agentName === 'researcher') {
    // TODO: add resource files to the agent input
    // if (state.resources) {
    //     let resourcesInfo = "**The user mentioned the following resource files:**\n\n";
    //     for (const resource of state.resources) {
    //         resourcesInfo += `- ${resource.title}\n`;
    //     }

    //     agentInput.messages.push(
    //         new HumanMessage({
    //             content: resourcesInfo + "\n\n" + "You MUST use the **local_search_tool** to retrieve the information from the resource files."
    //         })
    //     );
    // }

    agentInput.push(
      new HumanMessage({
        content:
          'IMPORTANT: DO NOT include inline citations in the text. Instead, track all sources and include a References section at the end using link reference format. Include an empty line between each citation for better readability. Use this format for each reference:\n- [Source Title](URL)\n\n- [Another Source](URL)',
        name: 'system'
      })
    );
  }

  // Invoke the agent
  const defaultRecursionLimit = 25;
  let recursionLimit: number;
  try {
    const envValueStr = process.env.AGENT_RECURSION_LIMIT || defaultRecursionLimit.toString();
    const parsedLimit = parseInt(envValueStr);

    if (parsedLimit > 0) {
      recursionLimit = parsedLimit;
      console.info(`Recursion limit set to: ${recursionLimit}`);
    } else {
      console.warn(
        `AGENT_RECURSION_LIMIT value '${envValueStr}' (parsed as ${parsedLimit}) is not positive. ` +
          `Using default value ${defaultRecursionLimit}.`
      );
      recursionLimit = defaultRecursionLimit;
    }
  } catch (error) {
    const rawEnvValue = process.env.AGENT_RECURSION_LIMIT;
    console.warn(
      `Invalid AGENT_RECURSION_LIMIT value: '${rawEnvValue}'. ` + `Using default value ${defaultRecursionLimit}.`
    );
    recursionLimit = defaultRecursionLimit;
  }

  console.info(`Agent input: ${JSON.stringify(agentInput)}`);
  const result = await agent.invoke(
    {
      messages: agentInput
    },
    { recursionLimit }
  );

  // Process the result
  const responseContent = result.messages[result.messages.length - 1].content;
  console.debug(`${agentName.charAt(0).toUpperCase() + agentName.slice(1)} full response: ${responseContent}`);

  // Update the step with the execution result
  currentStep.execution_res = responseContent;
  console.info(`Step '${currentStep.title}' execution completed by ${agentName}`);

  return new Command({
    update: {
      messages: [
        new HumanMessage({
          content: responseContent,
          name: agentName
        })
      ],
      observations: [...observations, responseContent]
    },
    goto: 'research_team'
  });
}
