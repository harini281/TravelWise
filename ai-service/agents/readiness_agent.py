from state.workflow_state import TravelWiseState
from tools.readiness_tools import assess_trip_readiness


def run_readiness_agent(state: TravelWiseState) -> TravelWiseState:
    trip_id = state.get("trip_id")

    state["agent_results"] = state.get(
        "agent_results",
        {}
    )

    if not trip_id:
        state["agent_results"]["readiness"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }

        return state

    readiness_result = assess_trip_readiness(trip_id)

    if readiness_result.get("status") != "SUCCESS":
        state["agent_results"]["readiness"] = {
            "status": readiness_result.get(
                "status",
                "ERROR"
            ),
            "trip_id": trip_id,
            "message": readiness_result.get(
                "message",
                "Unable to complete readiness assessment."
            )
        }

        return state

    readiness = readiness_result["readiness"]

    level = readiness.get(
        "readinessLevel",
        "UNKNOWN"
    )

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
            "The traveller should resolve missing requirements "
            "before proceeding."
        )

    else:
        recommendation = (
            "Readiness information could not be interpreted safely."
        )

    state["agent_results"]["readiness"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "readiness_score": readiness.get(
                "readinessScore"
            ),
            "readiness_level": level,
            "total_requirements": readiness.get(
                "totalRequirements"
            ),
            "completed_requirements": readiness.get(
                "completedRequirements"
            ),
            "missing_requirements": readiness.get(
                "missingRequirements"
            ),
            "summary": readiness.get(
                "summary"
            ),
            "recommendation": recommendation
        }
    }

    return state