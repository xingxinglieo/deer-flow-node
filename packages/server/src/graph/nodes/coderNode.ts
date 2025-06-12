import { Command } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { State } from "../types";
import { setupAndExecuteAgentStep } from "./util";
import { executeJSCode } from "~/tools";


export function coderNode(
    state: State,
    config: RunnableConfig
): Promise<Command<"research_team">> {
    // Coder node that do code analysis
    console.log("Coder node is coding.");
    return setupAndExecuteAgentStep(
        state,
        config,
        "coder",
        [executeJSCode]
    );
}