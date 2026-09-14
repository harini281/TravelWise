import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function WorkflowDashboard({ tripId, user, isReviewMode = false }) {
  const [workflow, setWorkflow] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Workflow/trip/${tripId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setWorkflow(null);
          setAiResult(null);
          return;
        }
        const text = await response.text();
        throw new Error(text || "Failed to load workflow.");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        if (data.length === 0) {
          setWorkflow(null);
          setAiResult(null);
        } else {
          setWorkflow(data[data.length - 1]);
        }
      } else {
        setWorkflow(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!tripId) {
    return (
      <section>
        <h2 className="page-title">AI Planning Workflow</h2>
        <p className="body-text">Select a saved trip to run or review its planning workflow.</p>
      </section>
    );
  }

  useEffect(() => {
    loadWorkflow();
  }, [tripId]);

  const runIntelligentPlan = async () => {
    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const headers = { "Content-Type": "application/json" };
      if (user?.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/Workflow/trip/${tripId}/run`, {
        method: "POST",
        headers: headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to run AI workflow.");
      }

      const data = await response.json();
      setWorkflow(data.workflow);
      setAiResult(data.aiResult);
      setMessage("Intelligent travel plan generated successfully. Awaiting human governance review.");
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const submitDecision = async (decision) => {
    if (!workflow) return;

    if (!user) {
      setError("You must sign in to submit a review decision.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const reviewerIdentifier = user.email || user.username || "Reviewer";

      const response = await fetch(`${API_BASE_URL}/api/Workflow/${workflow.id}/approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          decision: decision,
          reviewer: reviewerIdentifier,
          comment: comment.trim() || (decision === "APPROVE" ? "Approved by reviewer." : "Review decision submitted."),
        }),
      });

      if (response.status === 401) throw new Error("Authentication required. Please sign in.");
      if (response.status === 403) throw new Error("Access restricted: Only Reviewers and Administrators may approve workflows.");

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to process approval.");
      }

      const data = await response.json();
      setWorkflow(data);
      setMessage(`Workflow decision submitted: ${decision} (Status: ${data.status})`);
      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const isSafeFailure =
    workflow?.status === "SAFE_FAILURE" ||
    workflow?.status === "EXTERNAL_SERVICE_FAILED" ||
    aiResult?.workflow_status === "SAFE_FAILURE";

  const isReviewerOrAdmin = user?.role === "Reviewer" || user?.role === "Admin";

  // Timeline Step Calculations
  const getTimelineSteps = () => {
    const steps = [
      { id: "created", label: "Created", done: false, active: false },
      { id: "planning", label: "Planning", done: false, active: false },
      { id: "agents", label: "Agents Running", done: false, active: false },
      { id: "validation", label: "Validation", done: false, active: false },
      { id: "approval", label: "Awaiting Approval", done: false, active: false },
      { id: "completed", label: "Completed", done: false, active: false },
    ];

    if (!workflow) return steps;

    steps[0].done = true; // Created is done

    if (workflow.status === "PLANNING" || processing) {
      steps[1].active = true;
    } else if (workflow.status === "AWAITING_APPROVAL" || workflow.status === "SAFE_FAILURE") {
      steps[1].done = true;
      steps[2].done = true;
      steps[3].done = workflow.validationPassed === true;
      steps[4].active = true;
    } else if (workflow.status === "COMPLETED") {
      steps.forEach((s) => (s.done = true));
      steps[5].done = true;
      steps[5].active = true;
    }

    return steps;
  };

  const renderAgentCard = (agentKey, title, fallbackRole, icon) => {
    const result = aiResult?.agent_results?.[agentKey];
    const isFallback = result?.is_fallback === true || result?.status === "FALLBACK_DETERMINISTIC";
    const statusText = isFallback
      ? "Fallback deterministic result"
      : result?.status || (workflow ? "Completed" : "Ready");
    const analysis = result?.analysis;

    return (
      <div
        key={agentKey}
        className="tw-card"
        style={{
          margin: 0,
          backgroundColor: isFallback ? "#fffdf5" : "var(--bg-surface)",
          border: isFallback ? "1px solid #fde68a" : "1px solid var(--border-color)",
          borderTop: `4px solid ${isFallback ? "#f59e0b" : "var(--secondary)"}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>{icon}</span>
              <strong style={{ fontSize: "0.98rem", color: "var(--text-primary)" }}>{title}</strong>
            </div>
            <span className={isFallback ? "badge badge-warning" : result?.status === "SUCCESS" || workflow ? "badge badge-success" : "badge badge-info"}>
              {statusText}
            </span>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            {fallbackRole}
          </p>

          {analysis ? (
            <div style={{ fontSize: "0.84rem", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              {agentKey === "budget" && (
                <div>
                  <div>Total Budget: <strong>LKR {analysis.total_budget?.toLocaleString()}</strong></div>
                  <div>Spent: LKR {analysis.total_spent?.toLocaleString()} ({analysis.spending_percentage}%)</div>
                  <div>Remaining: LKR {analysis.remaining_budget?.toLocaleString()}</div>
                  <div style={{ marginTop: "4px" }}>
                    Status: <strong style={{ color: "var(--success)" }}>{analysis.health}</strong>
                  </div>
                </div>
              )}
              {agentKey === "activity" && (
                <div>
                  <div>Planned Activities: <strong>{analysis.activity_count}</strong></div>
                  <div style={{ marginTop: "4px" }}>
                    Analysis: {analysis.recommendation}
                  </div>
                </div>
              )}
              {agentKey === "risk" && (
                <div>
                  <div>Risk Score: <strong>{analysis.risk_score} / 100</strong></div>
                  <div>Risk Category: <strong>{analysis.risk_level}</strong></div>
                  <div style={{ marginTop: "4px" }}>
                    Telemetry: {analysis.summary}
                  </div>
                </div>
              )}
              {agentKey === "readiness" && (
                <div>
                  <div>Compliance Score: <strong>{analysis.readiness_score}%</strong></div>
                  <div>Readiness Level: <strong>{analysis.readiness_level}</strong></div>
                  <div style={{ marginTop: "4px" }}>
                    Status: {analysis.summary}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", padding: "10px 0" }}>
              {workflow ? "Agent invariant checks verified." : "Awaiting workflow orchestration execution."}
            </div>
          )}
        </div>

        {isFallback && (
          <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #fde68a", fontSize: "0.75rem", color: "#b45309" }}>
            ⚠️ Fallback deterministic result — AI service unavailable
          </div>
        )}
      </div>
    );
  };

  const steps = getTimelineSteps();

  return (
    <section>
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">
            {isReviewMode ? "AI Workflow Review & Governance" : "AI Trip Planner"}
          </h2>
          <p className="body-text">
            TravelWise coordinates specialized multi-agent systems to evaluate and optimize your journey.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={runIntelligentPlan}
          disabled={processing}
        >
          {processing ? "Planning your trip..." : "⚡ Generate Intelligent Trip Plan"}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            color: "var(--success)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          ✓ {message}
        </div>
      )}

      {/* Safe Failure Alert Card (Section 14) */}
      {isSafeFailure && (
        <div
          className="tw-card"
          style={{
            backgroundColor: "var(--warning-bg)",
            border: "2px solid #f59e0b",
            color: "#92400e",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "#92400e" }}>
              AI Planning Temporarily Unavailable
            </h3>
            <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
              SAFE FAILURE
            </span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: "0.9rem", lineHeight: "1.5" }}>
            The AI planning service could not be reached. Deterministic safety checks were completed where possible.
            AI-generated recommendations are unavailable. Human review is required.
          </p>
          <div style={{ fontSize: "0.8rem", opacity: 0.9 }}>
            Deterministic financial balances and chronological date invariants remain validated.
          </div>
        </div>
      )}

      {/* Visual Workflow Timeline Card (Section 12) */}
      <div className="tw-card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 className="tw-card-title">
            <span>🔄</span> Orchestration Lifecycle Timeline
          </h3>
          <div style={{ display: "flex", gap: "8px" }}>
            {workflow && (
              <>
                <span className="badge badge-info">ID #{workflow.id}</span>
                <span className={workflow.validationPassed ? "badge badge-success" : "badge badge-danger"}>
                  {workflow.validationPassed ? "Validation: PASSED" : "Validation: FAILED"}
                </span>
                <span className={workflow.approvalStatus === "APPROVED" ? "badge badge-success" : "badge badge-warning"}>
                  {workflow.approvalStatus || "PENDING"}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
          {steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                textAlign: "center",
                padding: "12px 8px",
                borderRadius: "var(--radius-md)",
                backgroundColor: step.active
                  ? "var(--primary)"
                  : step.done
                  ? "var(--success-bg)"
                  : "var(--bg-surface-alt)",
                color: step.active ? "#ffffff" : step.done ? "var(--success)" : "var(--text-muted)",
                border: `1px solid ${step.active ? "var(--primary)" : step.done ? "var(--success-border)" : "var(--border-color)"}`,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>
                {step.done ? "✓" : step.active ? "●" : idx + 1}
              </div>
              <div style={{ fontSize: "0.8rem", fontWeight: "600" }}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Specialized Agent Cards */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "1.3rem" }}>🧠</span>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
              LangGraph Specialized Agent Execution
            </h3>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Structured agent analytical summaries without exposed internal chain-of-thought
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
          {renderAgentCard("budget", "Budget Agent", "Spending velocity, category limits & burn rates", "💳")}
          {renderAgentCard("activity", "Activity Agent", "Itinerary density, scheduling conflicts & duration", "🗓️")}
          {renderAgentCard("risk", "Risk Agent", "Live Open-Meteo weather telemetry & terrain safety", "🛡️")}
          {renderAgentCard("readiness", "Readiness Agent", "Mandatory documents, checklists & compliance", "📋")}
        </div>
      </div>

      {/* Human Reviewer Governance Section (Section 13) */}
      <div className="tw-card" style={{ borderLeft: "4px solid var(--primary)", padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: "0 0 4px", color: "var(--text-primary)" }}>
              🛡️ Human-in-the-Loop Governance & Evaluation
            </h3>
            <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", margin: 0 }}>
              Mandatory human oversight ensures travel safety and financial accountability before final plan activation.
            </p>
          </div>
          {workflow && (
            <span className={workflow.approvalStatus === "APPROVED" ? "badge badge-success" : "badge badge-warning"}>
              {workflow.approvalStatus || "PENDING"}
            </span>
          )}
        </div>

        {isReviewerOrAdmin ? (
          <div>
            <div
              style={{
                backgroundColor: "var(--primary-light)",
                border: "1px solid #bfdbfe",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.86rem",
                color: "var(--primary)",
                marginBottom: "16px",
              }}
            >
              Authenticated as <strong>{user.role}</strong> ({user.email || user.username}). You have authorized authority to approve, reject, or request revisions.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="review-notes">
                Reviewer Evaluation Rationale / Notes:
              </label>
              <textarea
                id="review-notes"
                rows={3}
                className="form-textarea"
                placeholder="Document your safety evaluation, budget commentary, or revision directives..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => submitDecision("APPROVE")}
                disabled={processing || workflow?.status === "COMPLETED"}
              >
                ✓ Approve Plan
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => submitDecision("REJECT")}
                disabled={processing}
              >
                ✕ Reject Plan
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: "var(--warning)", color: "#ffffff" }}
                onClick={() => submitDecision("REVISE")}
                disabled={processing}
              >
                ↺ Request Revision
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={loadWorkflow}
                disabled={processing}
              >
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "16px",
              backgroundColor: "var(--bg-surface-alt)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-color)",
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
            }}
          >
            🔒 <strong>Approval Controls Restricted:</strong> Human review actions are reserved for authenticated Reviewers and Administrators.
            You are currently viewing as <em>{user ? user.role : "Guest (Unauthenticated)"}</em>. Sign in as a Reviewer using the top authentication bar to test approval actions.
          </div>
        )}
      </div>
    </section>
  );
}

export default WorkflowDashboard;
