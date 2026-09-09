from state.workflow_state import TravelWiseState
from tools.activity_tools import get_trip_activities


def run_activity_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Activity Agent.

    Retrieves activities through the controlled Activity Tool
    and produces a structured activity analysis.
    """

    trip_id = state.get("trip_id")

    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["activity"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    activity_result = get_trip_activities(trip_id)

    if activity_result.get("status") != "SUCCESS":
        state["agent_results"]["activity"] = {
            "status": activity_result.get("status", "ERROR"),
            "trip_id": trip_id,
            "message": activity_result.get(
                "message",
                "Unable to retrieve activities."
            )
        }
        return state

    activities = activity_result.get("activities", [])

    categories = {}

    for activity in activities:
        category = activity.get("category", "Other")
        categories[category] = categories.get(category, 0) + 1

    state["agent_results"]["activity"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "activity_count": len(activities),
            "categories": categories,
            "activities": activities,
            "message": (
                f"Found {len(activities)} planned activities "
                f"for this trip."
            )
        }
    }

    return state