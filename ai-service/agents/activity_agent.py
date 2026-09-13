from state.workflow_state import TravelWiseState
from tools.activity_tools import get_trip_activities


def run_activity_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Activity Agent.
    Evaluates activity planning using shared trip context first,
    or falls back to the controlled activity tool.
    """
    trip_id = state.get("trip_id")
    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["activity"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    activity_context = state.get("activity_context", {})
    activities = None

    # 1. First check shared trip context
    if activity_context and "activities" in activity_context:
        activities = activity_context["activities"]
    else:
        # 2. Invoke controlled activity tool if context not supplied
        activity_result = get_trip_activities(trip_id)
        if activity_result.get("status") == "SUCCESS":
            activities = activity_result.get("activities", [])
        elif state.get("trip_context"):
            activities = []

    if activities is None:
        state["agent_results"]["activity"] = {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Unable to retrieve trip activities from context or API."
        }
        return state

    activity_count = len(activities)
    if activity_count == 0:
        recommendation = (
            "No activities are currently planned. "
            "Consider adding activities based on traveller preferences."
        )
    else:
        recommendation = (
            f"{activity_count} activities are currently planned. "
            "Review schedule, cost, duration, and conflicts before final approval."
        )

    state["agent_results"]["activity"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "activity_count": activity_count,
            "activities": activities,
            "recommendation": recommendation
        }
    }

    return state