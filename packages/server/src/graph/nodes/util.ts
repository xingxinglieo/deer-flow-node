import { Command, Pregel, MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { State } from '../types';
import { Configuration } from '../../config/configuration';
import { applyPromptTemplate } from '@/prompts/template';
import { AGENT_LLM_MAP } from '@/config/agents';
import { getLLMByType } from '@/llm/index';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import dayjs from 'dayjs';

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
  if (configurable.mcp_settings?.servers) {
    for (const [serverName, serverConfig] of Object.entries(configurable.mcp_settings.servers)) {
      if (serverConfig.enabled_tools && serverConfig.add_to_agents?.includes(agentType)) {
        mcpServers[serverName] = Object.fromEntries(
          Object.entries(serverConfig).filter(([k]) => ['url', 'transport'].includes(k))
        );
        for (const toolName of serverConfig.enabled_tools) {
          enabledTools[toolName] = serverName;
        }
      }
    }
  }

  const loadedTools = [...defaultTools];
  // Create and execute agent with MCP tools if available
  let client: MultiServerMCPClient | null = null;
  if (Object.keys(mcpServers).length > 0) {
    client = new MultiServerMCPClient(mcpServers);
    for (const tool of await client.getTools().catch(() => [])) {
      const [_, serverName, toolName] = tool.name.split('__');
      if (toolName && serverName && toolName in enabledTools && enabledTools[toolName] === serverName) {
        tool.description = `Powered by '${enabledTools[tool.name]}'.\n${tool.description}`;
        loadedTools.push(tool);
      }
    }
  }
  // Use default tools if no MCP servers are configured
  const agent = createAgent(agentType, agentType, loadedTools);
  return await executeAgentStep(state, agent, agentType, config).finally(() => {
    client?.close();
  });
}

function createAgent(agentName: string, agentType: string, tools: any[]): any {
  /**
   * Factory function to create agents with consistent configuration.
   */
  return createReactAgent({
    name: agentName,
    llm: getLLMByType(AGENT_LLM_MAP[agentType]!),
    tools: tools,
    checkpointer: new MemorySaver()
  });
}

async function executeAgentStep(
  state: State,
  agent: Pregel<any, any>,
  agentName: string,
  config?: RunnableConfig
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
    ...applyPromptTemplate(agentName, state),
    new HumanMessage({
      content: `${completedStepsInfo}# Current Task\n\n## Title\n\n${currentStep.title}\n\n## Description\n\n${currentStep.description}\n\n## Locale\n\n${state.locale || 'en-US'}`
    })
  ];

  // Add citation reminder for researcher agent
  if (agentName === 'researcher') {
    // 添加资源文件提示
    // if (state.resources && state.resources.length > 0) {
    //   let resourcesInfo = "**The user mentioned the following resource files:**\n\n";
    //   for (const resource of state.resources) {
    //     resourcesInfo += `- ${resource.title}\n`;
    //   }

    //   agentInput.push(
    //     new HumanMessage({
    //       content: resourcesInfo + "\n\n" + "You MUST use the **local_search_tool** to retrieve the information from the resource files."
    //     })
    //   );
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
  const recursionLimit = parseInt(process.env.AGENT_RECURSION_LIMIT || defaultRecursionLimit.toString());

  console.info(`Agent input: ${JSON.stringify(agentInput)}`);

  // 配置 agent invoke 的参数，包括 thread_id 用于状态管理
  const thread_id = `agent-${agentName}-${dayjs().format('YYYY-MM-DD HH:mm:ss')}`;
  const result = await agent
    .invoke(
      {
        messages: agentInput
      },
      {
        configurable: {
          thread_id
        },
        recursionLimit
      }
    )
    .catch(async (e: any) => {
      console.error('Agent execution failed:', e);
      const states = await agent.getState({
        configurable: {
          thread_id
        }
      });
      const messages = [
        ...states.values.messages,
        new HumanMessage({
          content: `Tool usage limit reached. Please summarize the information gathered and draw conclusions:
  
  1. Key Information Summary
  2. Main Conclusions
  3. Remaining Issues
  
  Provide the best recommendations based on the available information.`
        })
      ];
      const response = await getLLMByType(AGENT_LLM_MAP[agentName]!).invoke(messages);
      return {
        messages: [...messages, response]
      };
    });

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
