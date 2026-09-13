import pytest
from fastapi.testclient import TestClient
from main import app
from schemas.workflow_dtos import WorkflowRunRequest
from orchestrator.orchestrator import run_travelwise_workflow
from state.workflow_state import TravelWiseState


client = TestClient(app)


def test_health_check():
    """Verify that the FastAPI service is healthy and reports all four agents."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "budget" in data["agents"]
    assert "activity" in data["agents"]
    assert "risk" in data["agents"]
    assert "readiness" in data["agents"]


def test_golden_case_workflow_api():
    """
    Golden-case test: Submit a complete travel workflow request through the API.
    Asserts that:
    1. The API responds with HTTP 200.
    2. All 4 agents (budget, activity, risk, readiness) produce SUCCESS results.
    3. The workflow status progresses to AWAITING_APPROVAL.
    4. Approval status is PENDING.
    5. Validation passes with no rule failures.
    """
    payload = {
        "workflow_id": 101,
        "trip_id": 2,
        "user_id": 1,
        "trip_context": {
            "starting_place": "Colombo",
            "destination": "Ella",
            "start_date": "2026-10-10",
            "return_date": "2026-10-13",
            "budget_amount": 80000.0,
            "traveller_count": 2,
            "trip_type": "Adventure"
        },
        "traveller_preferences": ["Scenic Train", "Hiking", "Photography"],
        "budget_context": {
            "total_budget": 80000.0,
            "allocated_budget": 65000.0
        },
        "activity_context": {
            "activities": [
                {"name": "Nine Arches Bridge", "cost": 1500.0},
                {"name": "Little Adam's Peak Hike", "cost": 2500.0}
            ]
        },
        "risk_context": {
            "weather_forecast": "Clear to Partly Cloudy",
            "road_condition": "Good"
        },
        "readiness_context": {
            "documents_ready": True,
            "hotel_booked": True
        },
        "requested_capabilities": ["budget", "activity", "risk", "readiness"]
    }

    response = client.post("/api/workflow/run", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["trip_id"] == 2
    assert data["workflow_status"] == "AWAITING_APPROVAL"
    assert data["approval_status"] == "PENDING"
    assert len(data["errors"]) == 0

    results = data["agent_results"]
    for agent in ["budget", "activity", "risk", "readiness"]:
        assert agent in results
        assert results[agent]["status"] == "SUCCESS"

    validation = data["validation_results"]
    assert validation["passed"] is True
    assert validation["requires_approval"] is True
    assert len(validation["checks"]) > 0
    for check in validation["checks"]:
        assert check["passed"] is True


def test_direct_orchestrator_execution():
    """Verify that the LangGraph workflow orchestrator runs state transitions directly."""
    initial_state: TravelWiseState = {
        "workflow_id": 1,
        "trip_id": 2,
        "user_id": 1,
        "trip_context": {
            "destination": "Kandy",
            "budget_amount": 50000.0,
            "traveller_count": 1
        },
        "traveller_preferences": ["Culture", "Temples"],
        "budget_context": {"total_budget": 50000.0},
        "activity_context": {},
        "risk_context": {},
        "readiness_context": {},
        "requested_capabilities": ["budget", "activity", "risk", "readiness"],
        "agent_tasks": [],
        "agent_results": {},
        "validation_results": {},
        "approval_status": "PENDING",
        "workflow_status": "PLANNING",
        "errors": []
    }

    final_state = run_travelwise_workflow(initial_state)

    assert final_state["workflow_status"] == "AWAITING_APPROVAL"
    assert "budget" in final_state["agent_results"]
    assert "activity" in final_state["agent_results"]
    assert "risk" in final_state["agent_results"]
    assert "readiness" in final_state["agent_results"]
