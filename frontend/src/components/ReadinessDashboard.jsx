import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function ReadinessDashboard({ tripId, trip, user, onNavigate }) {
  const [requirements, setRequirements] = useState([]);
  const [items, setItems] = useState([]);
  const [assessment, setAssessment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState("");

  const [showReqModal, setShowReqModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const [requirementForm, setRequirementForm] = useState({
    name: "",
    description: "",
    isRequired: true,
    deadline: "",
  });

  const [itemForm, setItemForm] = useState({
    travelRequirementId: "",
    status: "PENDING",
    notes: "",
  });

  const [editingItemId, setEditingItemId] = useState(null);

  const loadReadiness = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Readiness/trip/${tripId}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load readiness information.");
      }

      const data = await response.json();
      const loadedRequirements = data.requirements ?? data.travelRequirements ?? [];
      const loadedItems = data.items ?? data.readinessItems ?? [];

      setRequirements(loadedRequirements);
      setItems(loadedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadReadiness();
    } else {
      setRequirements([]);
      setItems([]);
      setAssessment(null);
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
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📋</div>
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
            Select or plan a trip across Sri Lanka to manage travel requirements, verify passports, and evaluate departure readiness scores.
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

  const assessReadiness = async () => {
    try {
      setAssessing(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Readiness/assess/trip/${tripId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to calculate readiness assessment.");
      }

      const data = await response.json();
      setAssessment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssessing(false);
    }
  };

  const addRequirement = async (event) => {
    event.preventDefault();

    try {
      setError("");
      const newRequirement = {
        tripId: tripId,
        name: requirementForm.name,
        description: requirementForm.description,
        isRequired: requirementForm.isRequired,
        deadline: requirementForm.deadline ? new Date(requirementForm.deadline).toISOString() : null,
      };

      const response = await fetch(`${API_URL}/api/Readiness/requirements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequirement),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to add travel requirement.");
      }

      setRequirementForm({
        name: "",
        description: "",
        isRequired: true,
        deadline: "",
      });
      setShowReqModal(false);
      await loadReadiness();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveReadinessItem = async (event) => {
    event.preventDefault();

    try {
      setError("");
      let response;

      if (editingItemId !== null) {
        response = await fetch(`${API_URL}/api/Readiness/items/${editingItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: itemForm.status,
            notes: itemForm.notes,
          }),
        });
      } else {
        response = await fetch(`${API_URL}/api/Readiness/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: tripId,
            travelRequirementId: Number(itemForm.travelRequirementId),
            status: itemForm.status,
            notes: itemForm.notes,
          }),
        });
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save checklist item.");
      }

      resetItemForm();
      await loadReadiness();
    } catch (err) {
      setError(err.message);
    }
  };

  const editItem = (item) => {
    setEditingItemId(item.id);
    setItemForm({
      travelRequirementId: item.travelRequirementId ?? "",
      status: item.status || "PENDING",
      notes: item.notes || "",
    });
    setShowItemModal(true);
  };

  const deleteItem = async (itemId) => {
    const confirmed = window.confirm("Are you sure you want to remove this checklist entry?");
    if (!confirmed) return;

    try {
      setError("");
      const response = await fetch(`${API_URL}/api/Readiness/items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to delete checklist item.");
      }

      await loadReadiness();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      travelRequirementId: "",
      status: "PENDING",
      notes: "",
    });
    setEditingItemId(null);
    setShowItemModal(false);
  };

  if (!tripId) {
    return (
      <section>
        <h2 className="page-title">Travel Readiness</h2>
        <p className="body-text">Select a saved trip to manage passport and readiness checks.</p>
      </section>
    );
  }

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return <span className="badge badge-success">✓ COMPLETED</span>;
      case "PENDING":
        return <span className="badge badge-warning">⏳ PENDING</span>;
      case "MISSING":
        return <span className="badge badge-danger">✕ MISSING</span>;
      case "EXPIRED":
        return <span className="badge badge-danger">⚠️ EXPIRED</span>;
      default:
        return <span className="badge badge-info">{status || "PENDING"}</span>;
    }
  };

  const completedCount = items.filter((i) => i.status === "COMPLETED").length;
  const totalCount = requirements.length > 0 ? requirements.length : items.length;
  const computedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const readinessScore = assessment?.readinessScore ?? computedPct;
  const readinessLevel = assessment?.readinessLevel ?? (readinessScore >= 80 ? "READY" : readinessScore >= 50 ? "PARTIALLY READY" : "ACTION REQUIRED");

  return (
    <section>
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Travel Readiness</h2>
          <p className="body-text">
            Pre-departure verification for mandatory passports, insurance, permits, and confirmations.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowReqModal(true)}
          >
            + New Requirement
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={assessReadiness}
            disabled={assessing}
          >
            {assessing ? "Evaluating..." : "📋 Assess Readiness"}
          </button>
        </div>
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

      {/* Top Readiness Score Card */}
      <div
        className="tw-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "20px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: readinessScore >= 80 ? "var(--success-bg)" : "var(--warning-bg)",
              border: `4px solid ${readinessScore >= 80 ? "var(--success)" : "var(--warning)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              fontWeight: "800",
              color: readinessScore >= 80 ? "var(--success)" : "var(--warning)",
            }}
          >
            {readinessScore}%
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700" }}>
                Pre-Departure Readiness Score
              </h3>
              <span className={readinessScore >= 80 ? "badge badge-success" : "badge badge-warning"}>
                {readinessLevel}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              {completedCount} of {totalCount} travel readiness requirements confirmed.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={assessReadiness}
          disabled={assessing}
        >
          {assessing ? "Calculating..." : "Re-evaluate Status"}
        </button>
      </div>

      {assessment && (
        <div
          className="tw-card"
          style={{
            backgroundColor: "var(--bg-surface-alt)",
            borderColor: readinessScore >= 80 ? "var(--success-border)" : "var(--warning-border)",
            marginBottom: "24px",
          }}
        >
          <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem", fontWeight: "700" }}>
            Deterministic Assessment Summary
          </h4>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: "1.5" }}>
            {assessment.summary || "All required documents and confirmations have been reviewed against deterministic compliance rules."}
          </p>
          {assessment.recommendation && (
            <div style={{ fontSize: "0.84rem", color: "var(--text-primary)" }}>
              <strong>Next Action:</strong> {assessment.recommendation}
            </div>
          )}
        </div>
      )}

      {/* Checklist Table Card */}
      <div className="tw-card">
        <div className="tw-card-header">
          <h3 className="tw-card-title">
            <span>📑</span> Document & Confirmation Checklist
          </h3>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              resetItemForm();
              setShowItemModal(true);
            }}
          >
            + Update / Track Item
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
            Loading readiness requirements...
          </p>
        ) : requirements.length === 0 && items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "12px" }}>
              No requirements configured for this trip yet.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowReqModal(true)}>
              Add Requirement
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="tw-table">
              <thead>
                <tr>
                  <th>Requirement Name</th>
                  <th>Mandatory</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map((req) => {
                  const item = items.find((i) => i.travelRequirementId === req.id);
                  return (
                    <tr key={req.id}>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{req.name}</strong>
                        {req.description && (
                          <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {req.description}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: req.isRequired ? "var(--danger-bg)" : "var(--bg-surface-alt)", color: req.isRequired ? "var(--danger)" : "var(--text-muted)" }}>
                          {req.isRequired ? "MANDATORY" : "OPTIONAL"}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                        {req.deadline ? new Date(req.deadline).toLocaleDateString() : "Flexible"}
                      </td>
                      <td>
                        {getStatusBadge(item?.status ?? "PENDING")}
                      </td>
                      <td style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                        {item?.notes || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            if (item) {
                              editItem(item);
                            } else {
                              setItemForm({
                                travelRequirementId: req.id,
                                status: "COMPLETED",
                                notes: "",
                              });
                              setEditingItemId(null);
                              setShowItemModal(true);
                            }
                          }}
                        >
                          {item ? "Update" : "Mark Status"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Requirement Modal */}
      {showReqModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReqModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowReqModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "6px" }}>
              Add Travel Requirement
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Define a document or prerequisite check for this itinerary.
            </p>

            <form onSubmit={addRequirement}>
              <div className="form-group">
                <label className="form-label" htmlFor="req-name">
                  Requirement Name
                </label>
                <input
                  id="req-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Travel Insurance Policy"
                  value={requirementForm.name}
                  onChange={(e) => setRequirementForm({ ...requirementForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="req-desc">
                  Description
                </label>
                <textarea
                  id="req-desc"
                  rows={2}
                  className="form-textarea"
                  placeholder="Coverage criteria, provider details, etc."
                  value={requirementForm.description}
                  onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="req-deadline">
                  Compliance Deadline
                </label>
                <input
                  id="req-deadline"
                  type="date"
                  className="form-input"
                  value={requirementForm.deadline}
                  onChange={(e) => setRequirementForm({ ...requirementForm, deadline: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  id="req-mandatory"
                  type="checkbox"
                  checked={requirementForm.isRequired}
                  onChange={(e) => setRequirementForm({ ...requirementForm, isRequired: e.target.checked })}
                />
                <label htmlFor="req-mandatory" style={{ fontSize: "0.88rem", fontWeight: "600", cursor: "pointer" }}>
                  Mandatory for trip departure
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Requirement
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setShowReqModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Item Modal */}
      {showItemModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetItemForm();
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
              width: "100%",
              maxWidth: "460px",
              padding: "28px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={resetItemForm}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "6px" }}>
              {editingItemId !== null ? "Update Checklist Item" : "Record Checklist Status"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              Verify status against required documents.
            </p>

            <form onSubmit={saveReadinessItem}>
              {editingItemId === null && (
                <div className="form-group">
                  <label className="form-label" htmlFor="item-req-id">
                    Select Requirement
                  </label>
                  <select
                    id="item-req-id"
                    className="form-select"
                    value={itemForm.travelRequirementId}
                    onChange={(e) => setItemForm({ ...itemForm, travelRequirementId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Requirement --</option>
                    {requirements.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isRequired ? "(Mandatory)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="item-status">
                  Status
                </label>
                <select
                  id="item-status"
                  className="form-select"
                  value={itemForm.status}
                  onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}
                  required
                >
                  <option value="COMPLETED">Completed (Verified)</option>
                  <option value="PENDING">Pending (In Progress)</option>
                  <option value="MISSING">Missing (Not Started)</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="item-notes">
                  Verification Notes / Document Ref
                </label>
                <textarea
                  id="item-notes"
                  rows={3}
                  className="form-textarea"
                  placeholder="e.g. Policy #TLW-98124 uploaded, valid through Oct 20"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Status
                </button>
                <button type="button" className="btn btn-outline" onClick={resetItemForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReadinessDashboard;
