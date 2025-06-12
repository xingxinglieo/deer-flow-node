import { Command, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { State } from "../types";
import { Configuration } from "~/config/configuration";
import { AGENT_LLM_MAP } from "~/config/agents";
import { getLLMByType } from "~/llm/index";
import { applyPromptTemplate } from "~/prompts/template";
import z from "zod";

export const handoffToPlanner = tool(() => {
    /**
     * Handoff to planner agent to do plan.
     * This tool is not returning anything: we're just using it
     * as a way for LLM to signal that it needs to hand off to planner agent
     */
    return;
}, {
    name: "handoff_to_planner",
    description: "Handoff to planner agent to do plan.",
    schema: z.object({
        taskTitle: z.string(),
        locale: z.string(),
    }),
});

export async function coordinatorNode(
    state: State,
    config: RunnableConfig
): Promise<Command<"planner" | "background_investigator" | "__end__">> {
    console.log("Coordinator talking.");
    const configurable = Configuration.fromRunnableConfig(config);
    const messages = applyPromptTemplate("coordinator", state);
    const response = await getLLMByType(AGENT_LLM_MAP["coordinator"]!)
        .bindTools([handoffToPlanner])
        .invoke(messages);
    
    console.log(`Current state messages: ${state.messages}`);

    let goto: "planner" | "background_investigator" | typeof END = END;
    let locale = state.locale || "zh-CN"; // Default locale if not specified

    if (response.tool_calls?.length) {
        goto = "planner";
        if (state.enable_background_investigation) {
            // 如果启用了背景调查，先进行搜索再进行规划
            goto = "background_investigator";
        }
        try {
            for (const toolCall of response.tool_calls) {
                if (toolCall.name !== "handoff_to_planner") {
                    continue;
                }
                const toolLocale = toolCall.args?.locale;
                if (toolLocale) {
                    locale = toolLocale;
                    break;
                }
            }
        } catch (e) {
            console.error(`Error processing tool calls: ${e}`);
        }
    } else {
        console.warn(
            "Coordinator response contains no tool calls. Terminating workflow execution."
        );
        console.debug(`Coordinator response: ${response}`);
    }

    return new Command({
        update: { locale, resources: configurable.resources },
        goto,
    });
}
