import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function WorkflowDashboard({ tripId = 2, user }) {
  const [workflow, setWorkflow] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [comment, setComment] = useState("");

  // --------------------------------------------------
  // READ WORKFLOW
  // --------------------------------------------------
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
    loadWorkflow();
  }, [tripId]);

  // --------------------------------------------------
  // RUN INTELLIGENT TRIP PLAN
  // --------------------------------------------------
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

      setMessage("Intelligent travel plan generated successfully. Awaiting human review.");
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // APPROVE / REJECT / REVISE (REVIEWER / ADMIN ONLY)
  // --------------------------------------------------
  const submitDecision = async (decision) => {
    if (!workflow) return;

    if (!user) {
      setError("You must log in to submit a review decision.");
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

      if (response.status === 401) {
        throw new Error("Authentication required. Please log in.");
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to perform this action. Only Reviewers and Administrators may approve workflows.");
      }

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

  const renderAgentCard = (agentKey, agentName, fallbackTask) => {
    const result = aiResult?.agent_results?.[agentKey];
    const isFallback = result?.is_fallback === true || result?.status === "FALLBACK_DETERMINISTIC";
    const statusText = isFallback
      ? "Fallback deterministic result"
      : result?.status || "Pending";

    const analysis = result?.analysis;

    return (
      <div
        key={agentKey}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "12px",
          backgroundColor: isFallback ? "#fffbeb" : "#f9fafb",
          flex: "1 1 calc(50% - 10px)",
          minWidth: "240px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem" }}>🤖 {agentName}</h4>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: "600",
              backgroundColor: isFallback ? "#fef3c7" : result?.status === "SUCCESS" ? "#d1fae5" : "#e5e7eb",
              color: isFallback ? "#92400e" : result?.status === "SUCCESS" ? "#065f46" : "#374151",
            }}
          >
            {statusText}
          </span>
        </div>

        <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0 0 6px" }}>
          {fallbackTask}
        </p>

        {analysis ? (
          <div style={{ fontSize: "0.82rem" }}>
            {agentKey === "budget" && (
              <div>
                <div>Total Budget: LKR {analysis.total_budget?.toLocaleString()}</div>
                <div>Spent: LKR {analysis.total_spent?.toLocaleString()} ({analysis.spending_percentage}%)</div>
                <div>Remaining: LKR {analysis.remaining_budget?.toLocaleString()}</div>
                <div>Health: <strong>{analysis.health}</strong></div>
              </div>
            )}
            {agentKey === "activity" && (
              <div>
                <div>Planned Activities: {analysis.activity_count}</div>
                <div>Recommendation: {analysis.recommendation}</div>
              </div>
            )}
            {agentKey === "risk" && (
              <div>
                <div>Risk Score: {analysis.risk_score} / 100</div>
                <div>Risk Level: <strong>{analysis.risk_level}</strong></div>
                <div>Weather: {analysis.summary}</div>
              </div>
            )}
            {agentKey === "readiness" && (
              <div>
                <div>Readiness Score: {analysis.readiness_score}%</div>
                <div>Status: <strong>{analysis.readiness_level}</strong></div>
                <div>Summary: {analysis.summary}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: "0.8rem", color: "#9ca3af", fontStyle: "italic" }}>
            Ready for execution
          </div>
        )}
      </div>
    );
  };

  return (
    <section style={{ margin: "20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h2>🤖 AI Workflow & Human Governance</h2>
        <button
          type="button"
          onClick={runIntelligentPlan}
          disabled={processing}
          style={{
            padding: "8px 18px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {processing ? "Executing Workflow..." : "⚡ Run Intelligent Trip Plan"}
        </button>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #ef4444",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: "6px",
            margin: "12px 0",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "10px 14px",
            borderRadius: "6px",
            margin: "12px 0",
            fontSize: "0.9rem",
          }}
        >
          ✓ {message}
        </div>
      )}

      {/* SAFE FAILURE BANNER (PHASE 5) */}
      {isSafeFailure && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "2px solid #f59e0b",
            color: "#92400e",
            padding: "12px 16px",
            borderRadius: "8px",
            margin: "14px 0",
          }}
        >
          <strong>⚠️ Safe Failure Notice:</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem" }}>
            AI service is temporarily unavailable. Deterministic safety checks were completed where possible.
            AI-generated recommendations are unavailable. Human review is required.
          </p>
        </div>
      )}

      {loading ? (
        <p>Loading workflow status...</p>
      ) : !workflow ? (
        <div style={{ padding: "16px", border: "1px dashed #d1d5db", borderRadius: "8px", textAlign: "center" }}>
          <p style={{ color: "#6b7280" }}>No AI workflow instance has been executed for this trip yet.</p>
          <button
            type="button"
            onClick={runIntelligentPlan}
            disabled={processing}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Run Initial Planning Workflow
          </button>
        </div>
      ) : (
        <div>
          {/* WORKFLOW STATUS SUMMARY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "10px",
              margin: "14px 0",
            }}
          >
            <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Workflow ID</div>
              <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>#{workflow.id}</div>
            </div>

            <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Workflow Status</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: workflow.status === "COMPLETED" ? "#10b981" : "#d97706" }}>
                {workflow.status}
              </div>
            </div>

            <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Approval Status</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: workflow.approvalStatus === "APPROVED" ? "#10b981" : "#f59e0b" }}>
                {workflow.approvalStatus}
              </div>
            </div>

            <div style={{ padding: "10px", border: "1px solid #e5e7eb", borderRadius: "6px", backgroundColor: "#f9fafb" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Validation</div>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: workflow.validationPassed ? "#10b981" : "#ef4444" }}>
                {workflow.validationPassed ? "PASSED" : "FAILED"}
              </div>
            </div>
          </div>

          {/* AGENT CARDS GRID */}
          <h3 style={{ margin: "16px 0 8px", fontSize: "1rem" }}>Specialized AI Planning Agents</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            {renderAgentCard("budget", "Budget Agent", "Analyzes spending velocity and category allocations.")}
            {renderAgentCard("activity", "Activity Agent", "Evaluates itinerary scheduling and conflicts.")}
            {renderAgentCard("risk", "Risk Agent", "Synthesizes live weather telemetry and travel safety.")}
            {renderAgentCard("readiness", "Readiness Agent", "Validates documents, visas, and pre-departure tasks.")}
          </div>

          {/* REVIEW DETAILS */}
          {(workflow.reviewer || workflow.approvalComment) && (
            <div style={{ padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", marginBottom: "16px" }}>
              <div><strong>Reviewer:</strong> {workflow.reviewer}</div>
              <div><strong>Approval Comment:</strong> {workflow.approvalComment}</div>
            </div>
          )}

          {/* HUMAN REVIEW PANEL (PHASE 4: ROLE AWARE) */}
          <div
            style={{
              padding: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              backgroundColor: isReviewerOrAdmin ? "#f8fafc" : "#f3f4f6",
            }}
          >
            <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>🛡️ Human-in-the-Loop Review</h3>

            {isReviewerOrAdmin ? (
              <div>
                <p style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "#475569" }}>
                  As an authenticated <strong>{user.role}</strong>, you have authority to review and approve or reject this AI-generated plan.
                </p>

                <div style={{ marginBottom: "10px" }}>
                  <label htmlFor="approvalComment" style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px" }}>
                    Reviewer Comment / Feedback:
                  </label>
                  <textarea
                    id="approvalComment"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter review decision rationale..."
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    disabled={processing || workflow.status === "COMPLETED"}
                    onClick={() => submitDecision("APPROVE")}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: workflow.status === "COMPLETED" ? "not-allowed" : "pointer",
                      opacity: workflow.status === "COMPLETED" ? 0.6 : 1,
                    }}
                  >
                    ✓ Approve Plan
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => submitDecision("REJECT")}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ✕ Reject Plan
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => submitDecision("REVISE")}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: "#d97706",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ↺ Request Revision
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={loadWorkflow}
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "#6b7280",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                🔒 <em>Approval controls are restricted to Reviewers and Administrators. You are currently viewing as {user ? <strong>{user.role}</strong> : "Guest (Not Logged In)"}.</em>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default WorkflowDashboard;