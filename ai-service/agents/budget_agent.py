from state.workflow_state import TravelWiseState


def run_budget_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Budget Agent entry point.

    The agent will later use controlled budget tools
    to analyze the traveller's budget and expenses.
    """

    state["agent_results"] = state.get("agent_results", {})

    state["agent_results"]["budget"] = {
        "status": "READY",
        "message": "Budget Agent received the task."
    }

    return state