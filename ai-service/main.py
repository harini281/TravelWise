import sys
import os

# Add directory to sys.path for relative imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas.workflow_dtos import WorkflowRunRequest, WorkflowRunResponse
from state.workflow_state import TravelWiseState
from orchestrator.orchestrator import run_travelwise_workflow

app = FastAPI(
    title="TravelWise Agentic AI Service",
    description="Multi-agent travel planning and validation service powered by LangGraph",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TravelWise Agentic AI Service",
        "engine": "LangGraph Multi-Agent Orchestrator",
        "agents": ["budget", "activity", "risk", "readiness"]
    }


@app.post("/api/workflow/run", response_model=WorkflowRunResponse)
def execute_workflow(request: WorkflowRunRequest):
    try:
        initial_state: TravelWiseState = {
            "workflow_id": request.workflow_id or 0,
            "trip_id": request.trip_id,
            "user_id": request.user_id or 1,
            "trip_context": request.trip_context,
            "traveller_preferences": request.traveller_preferences,
            "budget_context": request.budget_context,
            "activity_context": request.activity_context,
            "risk_context": request.risk_context,
            "readiness_context": request.readiness_context,
            "requested_capabilities": request.requested_capabilities,
            "agent_tasks": [],
            "agent_results": {},
            "validation_results": {},
            "approval_status": "PENDING",
            "workflow_status": "PLANNING",
            "errors": []
        }

        final_state = run_travelwise_workflow(initial_state)

        return WorkflowRunResponse(
            workflow_id=final_state.get("workflow_id"),
            trip_id=final_state.get("trip_id", request.trip_id),
            workflow_status=final_state.get("workflow_status", "AWAITING_APPROVAL"),
            approval_status=final_state.get("approval_status", "PENDING"),
            agent_tasks=final_state.get("agent_tasks", []),
            agent_results=final_state.get("agent_results", {}),
            validation_results=final_state.get("validation_results", {}),
            errors=final_state.get("errors", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI Workflow execution error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
