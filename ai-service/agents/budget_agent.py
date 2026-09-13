from state.workflow_state import TravelWiseState
from tools.budget_tools import get_trip_budget, get_budget_health


def run_budget_agent(state: TravelWiseState) -> TravelWiseState:
    """
    Budget Agent.
    Evaluates budget health using shared trip context first,
    or falls back to the controlled budget tool.
    """
    trip_id = state.get("trip_id")
    state["agent_results"] = state.get("agent_results", {})

    if not trip_id:
        state["agent_results"]["budget"] = {
            "status": "ERROR",
            "message": "Trip ID is missing."
        }
        return state

    budget_context = state.get("budget_context", {})
    budget_data = None

    # 1. First check shared trip context passed into the workflow
    if budget_context and ("total_budget" in budget_context or "totalAmount" in budget_context):
        total_budget = float(budget_context.get("total_budget") or budget_context.get("totalAmount", 0))
        total_spent = float(budget_context.get("total_spent") or budget_context.get("spentAmount", 0))
        if "expenses" in budget_context:
            total_spent = sum(float(e.get("amount", 0)) for e in budget_context["expenses"])
        budget_data = {
            "total_budget": total_budget,
            "total_spent": total_spent
        }
    else:
        # 2. Invoke controlled budget tool if context was not provided
        budget_result = get_trip_budget(trip_id)
        if budget_result.get("status") == "SUCCESS":
            b = budget_result.get("budget", {})
            total_budget = float(b.get("totalAmount", 0))
            total_spent = sum(float(e.get("amount", 0)) for e in b.get("expenses", []))
            budget_data = {
                "total_budget": total_budget,
                "total_spent": total_spent
            }
        elif state.get("trip_context", {}).get("budget_amount"):
            # Fallback to trip_context base budget
            total_budget = float(state["trip_context"]["budget_amount"])
            budget_data = {
                "total_budget": total_budget,
                "total_spent": 0.0
            }

    if not budget_data:
        state["agent_results"]["budget"] = {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Unable to retrieve budget information from context or API."
        }
        return state

    total_budget = budget_data["total_budget"]
    total_spent = budget_data["total_spent"]
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