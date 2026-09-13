from typing import Any, Optional
from pydantic import BaseModel, Field


class WorkflowRunRequest(BaseModel):
    workflow_id: Optional[int] = None
    trip_id: int
    user_id: Optional[int] = 1
    trip_context: dict[str, Any] = Field(default_factory=dict)
    traveller_preferences: list[str] = Field(default_factory=list)
    budget_context: dict[str, Any] = Field(default_factory=dict)
    activity_context: dict[str, Any] = Field(default_factory=dict)
    risk_context: dict[str, Any] = Field(default_factory=dict)
    readiness_context: dict[str, Any] = Field(default_factory=dict)
    requested_capabilities: list[str] = Field(
        default_factory=lambda: ["budget", "activity", "risk", "readiness"]
    )


class AgentResult(BaseModel):
    status: str
    trip_id: Optional[int] = None
    analysis: Optional[dict[str, Any]] = None
    message: Optional[str] = None


class ValidationCheck(BaseModel):
    rule: str
    passed: bool
    message: str


class ValidationResult(BaseModel):
    passed: bool
    checks: list[ValidationCheck] = Field(default_factory=list)
    requires_approval: bool = True


class WorkflowRunResponse(BaseModel):
    workflow_id: Optional[int] = None
    trip_id: int
    workflow_status: str
    approval_status: str
    agent_tasks: list[dict[str, Any]] = Field(default_factory=list)
    agent_results: dict[str, Any] = Field(default_factory=dict)
    validation_results: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
