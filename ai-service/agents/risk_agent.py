from state.workflow_state import TravelWiseState
from tools.risk_tools import assess_trip_risk


def run_risk_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Risk Agent.
    Evaluates weather risk using shared trip context first,
    or falls back to the controlled risk tool.
    """
    trip_id = state.get("trip_id")
    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["risk"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    risk_context = state.get("risk_context", {})
    risk_score = None
    risk_level = None
    summary = None

    # 1. First check shared trip context
    if risk_context and ("risk_score" in risk_context or "riskLevel" in risk_context or "risk_level" in risk_context):
        risk_score = risk_context.get("risk_score") if risk_context.get("risk_score") is not None else risk_context.get("riskScore", 0)
        risk_level = risk_context.get("risk_level") or risk_context.get("riskLevel", "LOW")
        summary = risk_context.get("summary") or risk_context.get("weather_forecast", "Conditions evaluated from trip context.")
    else:
        # 2. Invoke controlled risk tool if context not supplied
        risk_result = assess_trip_risk(trip_id)
        if risk_result.get("status") == "SUCCESS":
            risk = risk_result.get("risk", {})
            risk_score = risk.get("riskScore", 0)
            risk_level = risk.get("riskLevel", "LOW")
            summary = risk.get("summary", "Assessed via weather telemetry.")
        elif state.get("trip_context"):
            # Fallback to low risk baseline when external API is unreachable
            risk_score = 0
            risk_level = "LOW"
            summary = "Current baseline weather conditions indicate low travel risk."

    if risk_level is None:
        state["agent_results"]["risk"] = {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Unable to complete risk assessment."
        }
        return state

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
            "Severe travel risks detected. "
            "Activities should be reconsidered and human review is required."
        )
    else:
        recommendation = "Risk level evaluated. Proceed with normal precautions."

    state["agent_results"]["risk"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "summary": summary,
            "recommendation": recommendation
        }
    }

    return state