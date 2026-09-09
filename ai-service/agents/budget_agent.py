from state.workflow_state import TravelWiseState
from tools.budget_tools import get_trip_budget, get_budget_health


def run_budget_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Budget Agent.

    Retrieves real budget information through the controlled
    Budget Tool and produces a structured budget analysis.
    """

    trip_id = state.get("trip_id")

    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["budget"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    budget_result = get_trip_budget(trip_id)

    if budget_result.get("status") != "SUCCESS":
        state["agent_results"]["budget"] = {
            "status": budget_result.get("status", "ERROR"),
            "trip_id": trip_id,
            "message": budget_result.get(
                "message",
                "Unable to retrieve budget information."
            )
        }
        return state

    budget = budget_result["budget"]

    total_budget = float(budget.get("totalAmount", 0))
    total_spent = sum(
        float(expense.get("amount", 0))
        for expense in budget.get("expenses", [])
    )

    remaining_budget = total_budget - total_spent

    spending_percentage = (
        (total_spent / total_budget) * 100
        if total_budget > 0
        else 0
    )

    if spending_percentage < 50:
        health = "HEALTHY"
        recommendation = "Spending is currently under control."
    elif spending_percentage < 80:
        health = "MODERATE"
        recommendation = "Monitor spending to stay within the planned budget."
    elif spending_percentage < 100:
        health = "WARNING"
        recommendation = "Spending is getting close to the budget limit."
    else:
        health = "OVERSPENT"
        recommendation = "Reduce additional spending and review the remaining trip plan."

    state["agent_results"]["budget"] = {
        "status": "SUCCESS",
        "trip_id": trip_id,
        "analysis": {
            "total_budget": total_budget,
            "total_spent": round(total_spent, 2),
            "remaining_budget": round(remaining_budget, 2),
            "spending_percentage": round(spending_percentage, 2),
            "health": health,
            "recommendation": recommendation
        }
    }



    return state
def get_budget_health(budget_id: int) -> dict:
    """
    Retrieves deterministic budget-health information
    from the TravelWise ASP.NET Core API.
    """

    if budget_id <= 0:
        return {
            "status": "ERROR",
            "message": "Invalid budget ID."
        }

    url = f"{API_BASE_URL}/api/Budgets/{budget_id}/health"

    try:
        response = httpx.get(url, timeout=10.0)

        if response.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "budget_id": budget_id,
                "message": "Budget was not found."
            }

        response.raise_for_status()

        return {
            "status": "SUCCESS",
            "budget_id": budget_id,
            "health": response.json()
        }

    except httpx.TimeoutException:
        return {
            "status": "ERROR",
            "budget_id": budget_id,
            "message": "Budget health API request timed out."
        }

    except httpx.HTTPError as error:
        return {
            "status": "ERROR",
            "budget_id": budget_id,
            "message": f"Budget health API request failed: {error}"
        }