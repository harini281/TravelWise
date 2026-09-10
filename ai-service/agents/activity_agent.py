from state.workflow_state import TravelWiseState
from tools.risk_tools import assess_trip_risk


def run_risk_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Risk Agent.

    Uses the controlled Risk Tool to retrieve
    the deterministic trip risk assessment.
    """

    trip_id = state.get("trip_id")

    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["risk"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    risk_result = assess_trip_risk(trip_id)

    if risk_result.get("status") != "SUCCESS":
        state["agent_results"]["risk"] = {
            "status": risk_result.get("status", "ERROR"),
            "trip_id": trip_id,
            "message": risk_result.get(
                "message",
                "Unable to complete risk assessment."
            )
        }
        return state

    risk = risk_result["risk"]

    risk_level = risk.get("riskLevel", "UNKNOWN")

    if risk_level == "LOW":
        recommendation = (
            "Current conditions indicate low risk. "
            "The traveller can continue with normal precautions."
        )

    elif risk_level == "MODERATE":
        recommendation = (
            "Some caution is recommended. "
            "Weather-sensitive activities should be monitored."
        )

    elif risk_level == "HIGH":
        recommendation = (
            "Safer alternatives should be considered "
            "for weather-sensitive activities."
        )

    elif risk_level == "CRITICAL":
        recommendation = (
            "High-risk activities should not proceed "
            "without review and approval."
        )

    else:
        recommendation = (
            "Risk information could not be interpreted safely."
        )

    state["agent_results"]["risk"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "risk_score": risk.get("riskScore"),
            "risk_level": risk_level,
            "summary": risk.get("summary"),
            "temperature_c": risk.get("temperatureC"),
            "wind_speed_kph": risk.get("windSpeedKph"),
            "weather_code": risk.get("weatherCode"),
            "recommendation": recommendation
        }
    }

    return state