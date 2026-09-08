from state.workflow_state import TravelWiseState


def orchestrate(state: TravelWiseState) -> TravelWiseState:
    """
    Determines which specialized agents are required
    for the current TravelWise request.
    """

    requested_capabilities = state.get("requested_capabilities", [])

    agent_tasks = []

    if "budget" in requested_capabilities:
        agent_tasks.append({
            "agent": "budget",
            "task": "Analyze the trip budget and expenses."
        })

    if "activity" in requested_capabilities:
        agent_tasks.append({
            "agent": "activity",
            "task": "Recommend and organize suitable activities."
        })

    if "risk" in requested_capabilities:
        agent_tasks.append({
            "agent": "risk",
            "task": "Assess travel and activity-related risks."
        })

    if "readiness" in requested_capabilities:
        agent_tasks.append({
            "agent": "readiness",
            "task": "Check travel readiness and required preparation."
        })

    state["agent_tasks"] = agent_tasks
    state["workflow_status"] = "DELEGATING"

    return state