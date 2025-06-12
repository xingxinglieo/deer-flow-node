import { Command } from "@langchain/langgraph";
import { State, StepType } from "../types";

export function researchTeamNode(
    state: State
): Command<"planner" | "researcher" | "coder"> {
    // Research team node that collaborates on tasks
    console.log("Research team is collaborating on tasks.");
    
    const currentPlan = state.current_plan;
    if (!currentPlan || !currentPlan.steps) {
        return new Command({ goto: "planner" });
    }
    
    if (currentPlan.steps.every(step => step.execution_res)) {
        return new Command({ goto: "planner" });
    }
    
    let currentStep;
    for (const step of currentPlan.steps) {
        if (!step.execution_res) {
            currentStep = step;
            break;
        }
    }
    
    if (currentStep?.step_type === StepType.RESEARCH) {
        return new Command({ goto: "researcher" });
    }
    
    if (currentStep?.step_type === StepType.PROCESSING) {
        return new Command({ goto: "coder" });
    }
    
    return new Command({ goto: "planner" });
}
