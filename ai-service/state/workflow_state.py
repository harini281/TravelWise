from typing import Any, TypedDict


class TravelWiseState(TypedDict, total=False):
    workflow_id: int
    trip_id: int
    user_id: int

    trip_context: dict[str, Any]
    traveller_preferences: list[str]

    budget_context: dict[str, Any]
    activity_context: dict[str, Any]
    risk_context: dict[str, Any]
    readiness_context: dict[str, Any]

    requested_capabilities: list[str]
    agent_tasks: list[dict[str, Any]]
    agent_results: dict[str, Any]

    validation_results: dict[str, Any]

    approval_status: str
    workflow_status: str

    errors: list[str]