import { apiFetch as fetch } from "../apiClient";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function WorkflowDashboard({ tripId, trip, user, onNavigate, isReviewMode = false }) {
  const [workflow, setWorkflow] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");

  const isReviewerOrAdmin = user?.role === "Reviewer" || user?.role === "Admin";

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

  useEffect(() => {
    if (tripId) {
      loadWorkflow();
    } else {
      setWorkflow(null);
      setAiResult(null);
      setLoading(false);
    }
  }, [tripId]);

  // Empty state when no trip is planned
  if (!tripId || !trip) {
    return (
      <section style={{ maxWidth: "800px", margin: "40px auto", padding: "0 16px" }}>
        <div
          className="tw-card"
          style={{
            textAlign: "center",
            padding: "56px 24px",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🤖</div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.1rem",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "12px",
            }}
          >
            Where will you go next?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1rem",
              lineHeight: "1.6",
              maxWidth: "520px",
              margin: "0 auto 28px",
            }}
          >
            Select or plan a trip across Sri Lanka to trigger multi-agent AI planning across budget, activities, risk, and travel readiness.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate && onNavigate("trip")}
            >
              ➕ Plan Your First Trip
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate && onNavigate("trip")}
            >
              Explore Destinations
            </button>
          </div>
        </div>
      </section>
    );
  }

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
      setMessage("✓ Intelligent multi-agent plan generated successfully! Submitted for governance evaluation.");
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

    // Require comment for revisions and rejections
    const trimmedComment = comment.trim();
    if ((decision === "REQUEST_CHANGES" || decision === "REVISE") && !trimmedComment) {
      setError("Please provide specific revision feedback notes for the traveller before submitting.");
      return;
    }

    if (decision === "REJECT" && !trimmedComment) {
      setError("Please provide a reason before rejecting this travel plan.");
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
          comment: trimmedComment || (decision === "APPROVE" ? "Approved by reviewer." : "Review decision submitted."),
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
      setMessage(`✓ Review decision recorded: ${decision} (Status: ${data.status})`);
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

  // Timeline Step Calculations
  const getTimelineSteps = () => {
    const steps = [
      { id: "created", label: "Trip Created", done: false, active: false },
      { id: "planning", label: "Agent Orchestration", done: false, active: false },
      { id: "validation", label: "Safety Invariants", done: false, active: false },
      { id: "approval", label: "Human Governance", done: false, active: false },
      { id: "completed", label: "Plan Activated", done: false, active: false },
    ];

    if (!workflow) {
      steps[0].done = true;
      return steps;
    }

    steps[0].done = true;

    if (workflow.status === "PLANNING" || processing) {
      steps[1].active = true;
    } else if (workflow.status === "AWAITING_APPROVAL" || workflow.status === "SAFE_FAILURE" || workflow.approvalStatus === "PENDING") {
      steps[1].done = true;
      steps[2].done = workflow.validationPassed === true;
      steps[3].active = true;
    } else if (workflow.status === "COMPLETED" || workflow.approvalStatus === "APPROVED") {
      steps.forEach((s) => (s.done = true));
    } else if (workflow.status === "REVISION_REQUIRED" || workflow.approvalStatus === "CHANGES_REQUESTED") {
      steps[1].done = true;
      steps[2].done = true;
      steps[3].active = true;
    }

    return steps;
  };

  const renderAgentCard = (agentKey, title, fallbackRole, icon) => {
    const result = aiResult?.agent_results?.[agentKey];
    const isFallback = result?.is_fallback === true || result?.status === "FALLBACK_DETERMINISTIC";
    const statusText = isFallback
      ? "Fallback deterministic"
      : result?.status || (workflow ? "Validated" : "Ready");
    const analysis = result?.analysis;

    return (
      <div
        key={agentKey}
        className="tw-card"
        style={{
          margin: 0,
          backgroundColor: isFallback ? "#fffdf5" : "var(--bg-surface)",
          border: isFallback ? "1px solid #fde68a" : "1px solid var(--border-color)",
          borderTop: `4px solid ${isFallback ? "#f59e0b" : "var(--teal)"}`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.25rem" }}>{icon}</span>
              <strong style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", color: "var(--ink)" }}>{title}</strong>
            </div>
            <span className={isFallback ? "badge badge-warning" : result?.status === "SUCCESS" || workflow ? "badge badge-success" : "badge badge-info"}>
              {statusText}
            </span>
          </div>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
            {fallbackRole}
          </p>

          {analysis ? (
            <div style={{ fontSize: "0.85rem", lineHeight: "1.6", color: "var(--text-secondary)" }}>
              {agentKey === "budget" && (
                <div>
                  <div>Total Budget: <strong>LKR {analysis.total_budget?.toLocaleString()}</strong></div>
                  <div>Spent: LKR {analysis.total_spent?.toLocaleString()} ({analysis.spending_percentage}%)</div>
                  <div>Remaining: LKR {analysis.remaining_budget?.toLocaleString()}</div>
                  <div style={{ marginTop: "4px" }}>
                    Health: <strong style={{ color: "var(--success)" }}>{analysis.health}</strong>
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
                  <div>Risk Level: <strong>{analysis.risk_level}</strong></div>
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
                    Summary: {analysis.summary}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
              {workflow ? "Agent invariant checks verified." : "Awaiting workflow orchestration execution."}
            </div>
          )}
        </div>

        {isFallback && (
          <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #fde68a", fontSize: "0.75rem", color: "#b45309" }}>
            ⚠️ Fallback deterministic result — AI service offline
          </div>
        )}
      </div>
    );
  };

  const steps = getTimelineSteps();

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
      case "COMPLETED":
        return <span className="badge badge-success">✓ APPROVED</span>;
      case "REJECTED":
        return <span className="badge badge-danger">✕ REJECTED</span>;
      case "CHANGES_REQUESTED":
      case "REVISION_REQUIRED":
        return <span className="badge badge-warning">↺ REVISION REQUESTED</span>;
      default:
        return <span className="badge badge-info">PENDING REVIEW</span>;
    }
  };

  return (
    <section>
      {/* Top Header */}
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">
            {isReviewMode ? "AI Workflow Governance & Audit" : "AI Multi-Agent Trip Planner"}
          </h2>
          <p className="body-text" style={{ margin: "4px 0 0" }}>
            Coordinate autonomous agent evaluations across budget, activities, Open-Meteo weather, and compliance for <strong>{trip?.destination}</strong>.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={runIntelligentPlan}
          disabled={processing}
        >
          {processing ? "Synthesizing Plan..." : "⚡ Generate Intelligent Trip Plan"}
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
          {message}
        </div>
      )}

      {/* Safe Failure Alert Card */}
      {isSafeFailure && (
        <div
          className="tw-card"
          style={{
            backgroundColor: "var(--warning-bg)",
            border: "2px solid #f59e0b",
            color: "var(--text-secondary)",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: "700", color: "var(--text-secondary)" }}>
              AI Planning Temporarily Operating in Safe Fallback Mode
            </h3>
            <span className="badge badge-warning" style={{ marginLeft: "auto" }}>
              SAFE FAILURE
            </span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: "0.9rem", lineHeight: "1.5" }}>
            The AI planning service was unreachable or timed out. Deterministic financial limits and date invariants remain verified.
            Human reviewer governance is required before plan activation.
          </p>
        </div>
      )}

      {/* Visual Workflow Timeline Card */}
      <div className="tw-card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
          <h3 className="tw-card-title">
            <span>🔄</span> Multi-Agent Orchestration Lifecycle
          </h3>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {workflow ? (
              <>
                <span className="badge badge-info">ID #{workflow.id}</span>
                <span className={workflow.validationPassed ? "badge badge-success" : "badge badge-danger"}>
                  {workflow.validationPassed ? "Invariants: PASSED" : "Invariants: FAILED"}
                </span>
                {getStatusBadge(workflow.approvalStatus || workflow.status)}
              </>
            ) : (
              <span className="badge badge-info">Ready to Run</span>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
          {steps.map((step, idx) => (
            <div
              key={step.id}
              style={{
                textAlign: "center",
                padding: "14px 10px",
                borderRadius: "var(--radius-md)",
                backgroundColor: step.active
                  ? "var(--ink)"
                  : step.done
                  ? "var(--success-bg)"
                  : "var(--bg-surface-alt)",
                color: step.active ? "#ffffff" : step.done ? "var(--success)" : "var(--text-muted)",
                border: `1px solid ${step.active ? "var(--ink)" : step.done ? "var(--success-border)" : "var(--border-color)"}`,
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontSize: "1.15rem", marginBottom: "4px" }}>
                {step.done ? "✓" : step.active ? "●" : idx + 1}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: "600" }}>
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Specialized Agent Cards */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <span style={{ fontSize: "1.3rem" }}>🧠</span>
          <div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 600, margin: 0, color: "var(--ink)" }}>
              Specialized Multi-Agent Evaluation
            </h3>
            <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
              Four specialized analytical engines verify itinerary safety, budget constraints, and pacing.
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {renderAgentCard("budget", "Budget Agent", "Spending velocity, category allocations & burn rates", "💳")}
          {renderAgentCard("activity", "Activity Agent", "Itinerary density, scheduling conflicts & duration", "🗓️")}
          {renderAgentCard("risk", "Risk Agent", "Live Open-Meteo weather telemetry & hazard thresholds", "🛡️")}
          {renderAgentCard("readiness", "Readiness Agent", "Checklist compliance & mandatory document status", "📋")}
        </div>
      </div>

      {/* Reviewer Comments & Feedback Card for Traveller */}
      {workflow?.approvalComment && (
        <div
          className="tw-card"
          style={{
            padding: "20px 24px",
            marginBottom: "24px",
            borderLeft: `5px solid ${workflow.approvalStatus === "APPROVED" ? "var(--success)" : "var(--warning)"}`,
            backgroundColor: workflow.approvalStatus === "APPROVED" ? "var(--success-bg)" : "#fffdf5",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
            <strong style={{ color: "var(--ink)", fontSize: "0.95rem" }}>
              💬 Reviewer Evaluation & Feedback
            </strong>
            {workflow.reviewer && (
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Evaluated by: <strong>{workflow.reviewer}</strong>
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
            "{workflow.approvalComment}"
          </p>
        </div>
      )}

      {/* Human Reviewer Governance Section */}
      <div className="tw-card" style={{ borderLeft: "5px solid var(--ink)", padding: "26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 600, margin: "0 0 4px", color: "var(--ink)" }}>
              🛡️ Human-in-the-Loop Governance & Evaluation
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
              Mandatory human oversight prevents unsafe travel activations and enforces financial accountability.
            </p>
          </div>
          {workflow && getStatusBadge(workflow.approvalStatus || workflow.status)}
        </div>

        {isReviewerOrAdmin ? (
          <div>
            <div
              style={{
                backgroundColor: "var(--primary-light)",
                border: "1px solid var(--teal-border)",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.88rem",
                color: "var(--ink)",
                marginBottom: "16px",
              }}
            >
              Logged in as <strong>{user.role}</strong> ({user.email || user.username}). You have authorized authority to approve, reject, or request revisions.
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="review-notes">
                Reviewer Evaluation Notes & Directives:
              </label>
              <textarea
                id="review-notes"
                rows={3}
                className="form-textarea"
                placeholder="Document your safety evaluation, budget commentary, or required revision directives for this traveller..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-success"
                onClick={() => submitDecision("APPROVE")}
                disabled={processing || workflow?.approvalStatus === "APPROVED"}
              >
                ✓ Approve Plan
              </button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: "var(--warning)", color: "#ffffff" }}
                onClick={() => submitDecision("REQUEST_CHANGES")}
                disabled={processing}
              >
                ↺ Request Revision
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
                className="btn btn-outline"
                onClick={loadWorkflow}
                disabled={processing}
              >
                Refresh Status
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: "18px 20px",
              backgroundColor: "var(--bg-surface-alt)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-color)",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: "1.6",
            }}
          >
            🔒 <strong>Approval Controls Restricted:</strong> Human review decisions are reserved for authorized Reviewers and Administrators.
            <div style={{ marginTop: "6px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {workflow?.approvalStatus === "APPROVED"
                ? "✓ Your travel plan has been fully approved and activated."
                : workflow?.approvalStatus === "CHANGES_REQUESTED"
                ? "⚠️ Changes were requested by your reviewer. Please see notes above and adjust your itinerary."
                : "Your plan has been submitted for governance review. You will see reviewer commentary once evaluated."}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default WorkflowDashboard;

