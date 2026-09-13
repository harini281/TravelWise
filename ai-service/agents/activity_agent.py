from state.workflow_state import TravelWiseState
from tools.activity_tools import get_trip_activities


def run_activity_agent(
    state: TravelWiseState
) -> TravelWiseState:

    trip_id = state.get("trip_id")

    state["agent_results"] = state.get(
        "agent_results",
        {}
    )

    if not trip_id:
        state["agent_results"]["activity"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }

        return state

    activity_result = get_trip_activities(trip_id)

    if activity_result.get("status") != "SUCCESS":
        state["agent_results"]["activity"] = {
            "status": activity_result.get(
                "status",
                "ERROR"
            ),
            "trip_id": trip_id,
            "message": activity_result.get(
                "message",
                "Unable to retrieve trip activities."
            )
        }

        return state

    activities = activity_result.get(
        "activities",
        []
    )

    activity_count = len(activities)

    if activity_count == 0:
        recommendation = (
            "No activities are currently planned. "
            "Consider adding activities based on traveller preferences."
        )

    else:
        recommendation = (
            f"{activity_count} activities are currently planned. "
            "Review schedule, cost, duration, and conflicts "
            "before final approval."
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