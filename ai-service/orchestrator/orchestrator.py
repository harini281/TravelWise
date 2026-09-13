from langgraph.graph import StateGraph, START, END

from state.workflow_state import TravelWiseState

from agents.budget_agent import run_budget_agent
from agents.activity_agent import run_activity_agent
from agents.risk_agent import run_risk_agent
from agents.readiness_agent import run_readiness_agent

from validation.workflow_validator import validate_workflow


# ---------------------------------------------------------
# 1. PLAN / DELEGATE
# ---------------------------------------------------------

def plan_workflow(state: TravelWiseState) -> TravelWiseState:

    requested_capabilities = state.get(
        "requested_capabilities",
        [
            "budget",
            "activity",
            "risk",
            "readiness"
        ]
    )

    state["requested_capabilities"] = requested_capabilities

    tasks = []

    if "budget" in requested_capabilities:
        tasks.append({
            "agent": "budget",
            "task": "Analyse trip budget and spending."
        })

    if "activity" in requested_capabilities:
        tasks.append({
            "agent": "activity",
            "task": "Analyse trip activities and schedule."
        })

    if "risk" in requested_capabilities:
        tasks.append({
            "agent": "risk",
            "task": "Assess travel safety and weather risk."
        })

    if "readiness" in requested_capabilities:
        tasks.append({
            "agent": "readiness",
            "task": "Assess traveller readiness."
        })

    state["agent_tasks"] = tasks

    state["agent_results"] = state.get(
        "agent_results",
        {}
    )

    state["errors"] = state.get(
        "errors",
        []
    )

    state["workflow_status"] = "DELEGATING"

    return state


# ---------------------------------------------------------
# 2. BUDGET AGENT NODE
# ---------------------------------------------------------

def budget_node(state: TravelWiseState) -> TravelWiseState:

    if "budget" not in state.get(
        "requested_capabilities",
        []
    ):
        return state

    state["workflow_status"] = "BUDGET_AGENT_RUNNING"

    return run_budget_agent(state)


# ---------------------------------------------------------
# 3. ACTIVITY AGENT NODE
# ---------------------------------------------------------

def activity_node(state: TravelWiseState) -> TravelWiseState:

    if "activity" not in state.get(
        "requested_capabilities",
        []
    ):
        return state

    state["workflow_status"] = "ACTIVITY_AGENT_RUNNING"

    return run_activity_agent(state)


# ---------------------------------------------------------
# 4. RISK AGENT NODE
# ---------------------------------------------------------

def risk_node(state: TravelWiseState) -> TravelWiseState:

    if "risk" not in state.get(
        "requested_capabilities",
        []
    ):
        return state

    state["workflow_status"] = "RISK_AGENT_RUNNING"

    return run_risk_agent(state)


# ---------------------------------------------------------
# 5. READINESS AGENT NODE
# ---------------------------------------------------------

def readiness_node(state: TravelWiseState) -> TravelWiseState:

    if "readiness" not in state.get(
        "requested_capabilities",
        []
    ):
        return state

    state["workflow_status"] = "READINESS_AGENT_RUNNING"

    return run_readiness_agent(state)


# ---------------------------------------------------------
# 6. FINALIZE AGENT RESULTS
# ---------------------------------------------------------

def finalize_workflow(
    state: TravelWiseState
) -> TravelWiseState:

    results = state.get(
        "agent_results",
        {}
    )

    requested_capabilities = state.get(
        "requested_capabilities",
        []
    )

    failed_agents = []

    for agent_name in requested_capabilities:

        result = results.get(agent_name)

        if result is None:
            failed_agents.append({
                "agent": agent_name,
                "status": "MISSING"
            })
            continue

        status = result.get(
            "status",
            "UNKNOWN"
        )

        if status != "SUCCESS":
            failed_agents.append({
                "agent": agent_name,
                "status": status
            })

    if failed_agents:

        state["workflow_status"] = "SAFE_FAILURE"

        state["errors"] = state.get(
            "errors",
            []
        )

        state["errors"].append(
            f"Agent failures: {failed_agents}"
        )

    else:

        state["workflow_status"] = "VALIDATING"

    return state


# ---------------------------------------------------------
# 7. VALIDATION NODE
# ---------------------------------------------------------

def validation_node(
    state: TravelWiseState
) -> TravelWiseState:

    if state.get("workflow_status") == "SAFE_FAILURE":
        return state

    return validate_workflow(state)


# ---------------------------------------------------------
# 8. BUILD LANGGRAPH
# ---------------------------------------------------------

workflow_builder = StateGraph(
    TravelWiseState
)


# ---------------------------------------------------------
# 9. REGISTER NODES
# ---------------------------------------------------------

workflow_builder.add_node(
    "plan",
    plan_workflow
)

workflow_builder.add_node(
    "budget_agent",
    budget_node
)

workflow_builder.add_node(
    "activity_agent",
    activity_node
)

workflow_builder.add_node(
    "risk_agent",
    risk_node
)

workflow_builder.add_node(
    "readiness_agent",
    readiness_node
)

workflow_builder.add_node(
    "finalize",
    finalize_workflow
)

workflow_builder.add_node(
    "validate",
    validation_node
)


# ---------------------------------------------------------
# 10. CONNECT GRAPH
# ---------------------------------------------------------

workflow_builder.add_edge(
    START,
    "plan"
)

workflow_builder.add_edge(
    "plan",
    "budget_agent"
)

workflow_builder.add_edge(
    "budget_agent",
    "activity_agent"
)

workflow_builder.add_edge(
    "activity_agent",
    "risk_agent"
)

workflow_builder.add_edge(
    "risk_agent",
    "readiness_agent"
)

workflow_builder.add_edge(
    "readiness_agent",
    "finalize"
)

workflow_builder.add_edge(
    "finalize",
    "validate"
)

workflow_builder.add_edge(
    "validate",
    END
)


# ---------------------------------------------------------
# 11. COMPILE GRAPH
# ---------------------------------------------------------

travelwise_graph = workflow_builder.compile()


# ---------------------------------------------------------
# 12. PUBLIC WORKFLOW RUNNER
# ---------------------------------------------------------

def run_travelwise_workflow(
    state: TravelWiseState
) -> TravelWiseState:

    result = travelwise_graph.invoke(state)

    return result