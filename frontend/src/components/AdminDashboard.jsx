import { useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Overview / Stats State
  const [stats, setStats] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [inspectedUser, setInspectedUser] = useState(null);
  const [selectedUserTrips, setSelectedUserTrips] = useState(null);
  const [tripsLoading, setTripsLoading] = useState(false);

  // Trips State
  const [trips, setTrips] = useState([]);
  const [tripSearch, setTripSearch] = useState("");
  const [tripsFetchLoading, setTripsFetchLoading] = useState(false);

  // AI Workflow Reviews State
  const [workflows, setWorkflows] = useState([]);
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("");
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [reviewingWorkflow, setReviewingWorkflow] = useState(null);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewProcessing, setReviewProcessing] = useState(false);

  // Audit History State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);

  // Global Alerts
  const [actionMessage, setActionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const authHeaders = {
    Authorization: `Bearer ${user?.token}`,
    "Content-Type": "application/json",
  };

  // 1. Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Admin/stats`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Failed to load admin stats:", e);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (userSearch) params.append("search", userSearch);
      if (userRoleFilter) params.append("role", userRoleFilter);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load users list.");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Fetch All Trips
  const fetchTrips = async () => {
    try {
      setTripsFetchLoading(true);
      const params = new URLSearchParams();
      if (tripSearch) params.append("search", tripSearch);

      const res = await fetch(`${API_BASE_URL}/api/Admin/trips?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load trips database.");
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setTripsFetchLoading(false);
    }
  };

  // 4. Fetch All Workflows
  const fetchWorkflows = async () => {
    try {
      setWorkflowsLoading(true);
      const params = new URLSearchParams();
      if (workflowStatusFilter) params.append("status", workflowStatusFilter);

      const res = await fetch(`${API_BASE_URL}/api/Admin/workflows?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load AI workflows.");
      const data = await res.json();
      setWorkflows(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setWorkflowsLoading(false);
    }
  };

  // 5. Fetch Audit History
  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      if (auditSearch) params.append("search", auditSearch);

      const res = await fetch(`${API_BASE_URL}/api/Admin/audit-history?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load governance audit logs.");
      const data = await res.json();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchStats();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "trips") {
      fetchTrips();
    } else if (activeTab === "reviews") {
      fetchWorkflows();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab, userSearch, userRoleFilter, tripSearch, workflowStatusFilter, auditSearch]);

  // Toggle user status
  const handleToggleStatus = async (targetUser) => {
    const newStatus = !targetUser.isActive;
    const actionLabel = newStatus ? "activate" : "deactivate";

    if (!window.confirm(`Are you sure you want to ${actionLabel} account for "${targetUser.username}"?`)) {
      return;
    }

    try {
      setActionMessage("");
      setErrorMessage("");

      const res = await fetch(`${API_BASE_URL}/api/Admin/users/${targetUser.id}/status`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to ${actionLabel} account.`);
      }

      setActionMessage(`✓ Successfully ${newStatus ? "activated" : "deactivated"} "${targetUser.username}".`);
      await fetchUsers();
      await fetchStats();
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  // Inspect trips for a user
  const handleInspectTrips = async (targetUser) => {
    try {
      setInspectedUser(targetUser);
      setTripsLoading(true);
      setSelectedUserTrips(null);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users/${targetUser.id}/trips`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Could not load user's trips.");
      const data = await res.json();
      setSelectedUserTrips(data.trips || []);
    } catch (err) {
      alert(err.message);
      setInspectedUser(null);
    } finally {
      setTripsLoading(false);
    }
  };

  // Open review modal for a workflow
  const handleOpenReview = async (wf) => {
    try {
      setReviewingWorkflow(wf);
      setReviewComment("");
      setReviewDetail(null);

      const res = await fetch(`${API_BASE_URL}/api/Admin/workflows/${wf.id}`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setReviewDetail(data);
      }
    } catch {
      // Non-blocking
    }
  };

  // Submit approval / revision / rejection
  const handleProcessApproval = async (decision) => {
    if (!reviewingWorkflow) return;

    const trimmedComment = reviewComment.trim();
    if ((decision === "REQUEST_CHANGES" || decision === "REVISE") && !trimmedComment) {
      alert("A comment is required when requesting revisions.");
      return;
    }

    if (decision === "REJECT" && !trimmedComment) {
      alert("A reason is required when rejecting a plan.");
      return;
    }

    try {
      setReviewProcessing(true);
      const res = await fetch(`${API_BASE_URL}/api/Admin/workflows/${reviewingWorkflow.id}/approval`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          decision: decision,
          comment: trimmedComment || (decision === "APPROVE" ? "Approved by administrator." : ""),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to process workflow decision.");
      }

      setActionMessage(`✓ Successfully recorded decision "${decision}" for Workflow #${reviewingWorkflow.id}.`);
      setReviewingWorkflow(null);
      await fetchWorkflows();
      await fetchStats();
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setReviewProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "APPROVED":
      case "COMPLETED":
        return <span className="badge badge-success">✓ APPROVED</span>;
      case "REJECTED":
        return <span className="badge badge-danger">✕ REJECTED</span>;
      case "CHANGES_REQUESTED":
      case "REVISION_REQUIRED":
        return <span className="badge badge-warning">↺ CHANGES REQUESTED</span>;
      default:
        return <span className="badge badge-info">PENDING</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
            Admin & System Governance Workspace
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
            Inspect user registries, manage account permissions, monitor trips, and govern AI travel planning workflows.
          </p>
        </div>
        <span className="badge badge-ai" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
          🛡️ Role: Administrator
        </span>
      </div>

      {/* Global Alerts */}
      {actionMessage && (
        <div style={{ padding: "12px 18px", borderRadius: "var(--radius-md)", backgroundColor: "var(--success-bg)", color: "var(--success)", borderLeft: "4px solid var(--success)", fontSize: "0.9rem" }}>
          {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "12px 18px", borderRadius: "var(--radius-md)", backgroundColor: "var(--danger-bg)", color: "var(--danger)", borderLeft: "4px solid var(--danger)", fontSize: "0.9rem" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid var(--border-color)",
          paddingBottom: "2px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "overview", label: "📊 Overview & Telemetry", count: null },
          { id: "users", label: "👥 User Registry", count: stats?.totalUsers },
          { id: "trips", label: "🗺️ All Trips", count: stats?.totalTrips },
          { id: "reviews", label: "⚖️ AI Workflow Reviews", count: stats?.pendingApprovals },
          { id: "audit", label: "📋 Audit History", count: null },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "10px 18px",
                border: "none",
                background: "transparent",
                borderBottom: isActive ? "3px solid var(--teal)" : "3px solid transparent",
                color: isActive ? "var(--ink)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: "0.92rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== null && tab.count !== undefined && (
                <span
                  style={{
                    backgroundColor: isActive ? "var(--teal-light)" : "var(--bg-surface-alt)",
                    color: isActive ? "var(--teal)" : "var(--text-muted)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & TELEMETRY                              */}
      {/* ======================================================== */}
      {activeTab === "overview" && (
        <div>
          {/* Key Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
            <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                Total Accounts
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>
                {stats?.totalUsers ?? "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {stats?.activeUsers ?? 0} active • {stats?.travellerUsers ?? 0} travellers
              </div>
            </div>

            <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                Registered Trips
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--teal)", marginTop: "4px" }}>
                {stats?.totalTrips ?? "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Total Allocated: LKR {stats?.totalAllocatedBudget ? Number(stats.totalAllocatedBudget).toLocaleString() : 0}
              </div>
            </div>

            <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                Planned Excursions
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>
                {stats?.totalActivities ?? "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                Curated & custom activities
              </div>
            </div>

            <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                AI Workflows
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: (stats?.pendingApprovals ?? 0) > 0 ? "var(--warning)" : "var(--success)", marginTop: "4px" }}>
                {stats?.totalWorkflows ?? "—"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {stats?.pendingApprovals ?? 0} awaiting governance review
              </div>
            </div>
          </div>

          {/* System Status & Architecture Card */}
          <div className="tw-card" style={{ padding: "24px" }}>
            <div className="tw-card-header">
              <h3 className="tw-card-title">
                <span>🛡️</span> Architecture & Security Health
              </h3>
              <span className="badge badge-success">OPERATIONAL</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
              <div style={{ backgroundColor: "var(--bg-surface-alt)", padding: "16px", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                  PostgreSQL Persistence Context
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Active database connection with strict foreign keys, transactional expense reconciliations, and audit log tables.
                </p>
              </div>

              <div style={{ backgroundColor: "var(--bg-surface-alt)", padding: "16px", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                  Deterministic Safety & Open-Meteo
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Direct API calls to Open-Meteo providing weather telemetry, temperature/wind analysis, and alternative date calculations.
                </p>
              </div>

              <div style={{ backgroundColor: "var(--bg-surface-alt)", padding: "16px", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                  Human-in-the-Loop Governance
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Separation of privileges: Travellers submit plans, while Reviewers and Administrators evaluate and approve activation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: USER REGISTRY                                     */}
      {/* ======================================================== */}
      {activeTab === "users" && (
        <div>
          {/* Search and Filters */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Search username, full name, or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ padding: "10px 14px", fontSize: "0.9rem" }}
              />
            </div>

            <div style={{ width: "180px" }}>
              <select
                className="auth-input"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ padding: "10px 14px", fontSize: "0.9rem" }}
              >
                <option value="">All Roles</option>
                <option value="Traveller">Traveller</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setUserSearch("");
                setUserRoleFilter("");
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Users Table Card */}
          <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
            {usersLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading user accounts...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No user accounts found matching your query.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "14px 18px" }}>User</th>
                      <th style={{ padding: "14px 18px" }}>Role</th>
                      <th style={{ padding: "14px 18px" }}>Preferences</th>
                      <th style={{ padding: "14px 18px" }}>Trips</th>
                      <th style={{ padding: "14px 18px" }}>Account Status</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isSelf = u.id === user?.id;

                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                              {u.fullName || u.username} {isSelf && <span style={{ fontSize: "0.72rem", color: "var(--teal)" }}>(You)</span>}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              @{u.username} • {u.email}
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span
                              className={`badge ${
                                u.role === "Admin"
                                  ? "badge-ai"
                                  : u.role === "Reviewer"
                                  ? "badge-warning"
                                  : "badge-info"
                              }`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            {u.travelStyle ? (
                              <div>
                                <strong>{u.travelStyle}</strong> • {u.budgetStyle || "Balanced"}
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not onboarded</span>
                            )}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{u.tripCount}</span> trips
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span
                              className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}
                              style={{ fontSize: "0.75rem" }}
                            >
                              {u.isActive ? "ACTIVE" : "DEACTIVATED"}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => handleInspectTrips(u)}
                                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                              >
                                Inspect Trips
                              </button>

                              {!isSelf && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleToggleStatus(u)}
                                  style={{
                                    fontSize: "0.78rem",
                                    padding: "4px 10px",
                                    backgroundColor: u.isActive ? "#fee2e2" : "#dcfce7",
                                    color: u.isActive ? "#b91c1c" : "#15803d",
                                    border: u.isActive ? "1px solid #fca5a5" : "1px solid #86efac",
                                  }}
                                >
                                  {u.isActive ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ALL TRIPS DATABASE                                */}
      {/* ======================================================== */}
      {activeTab === "trips" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Filter trips by destination, starting place, or owner name..."
                value={tripSearch}
                onChange={(e) => setTripSearch(e.target.value)}
                style={{ padding: "10px 14px", fontSize: "0.9rem" }}
              />
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setTripSearch("")}
            >
              Reset
            </button>
          </div>

          <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
            {tripsFetchLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading trips from database...
              </div>
            ) : trips.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No trips found matching the criteria.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "14px 18px" }}>Trip ID & Route</th>
                      <th style={{ padding: "14px 18px" }}>Owner</th>
                      <th style={{ padding: "14px 18px" }}>Dates & Travellers</th>
                      <th style={{ padding: "14px 18px" }}>Budget & Spent</th>
                      <th style={{ padding: "14px 18px" }}>Status</th>
                      <th style={{ padding: "14px 18px" }}>Mode & Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t) => {
                      const isCompleted = t.status === "COMPLETED";
                      const startFmt = t.startDate ? new Date(t.startDate).toLocaleDateString() : "TBD";
                      const returnFmt = t.returnDate ? new Date(t.returnDate).toLocaleDateString() : "TBD";

                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                              #{t.id} • {t.startingPlace} ➔ {t.destination}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {t.tripType || "Adventure"} • {t.travelScope || "Local"}
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{t.ownerName}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{t.ownerEmail}</div>
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            <div>📅 {startFmt} – {returnFmt}</div>
                            <div>👥 {t.travellerCount} Travellers</div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ fontWeight: 700, color: "var(--teal)" }}>
                              LKR {t.budgetAmount ? Number(t.budgetAmount).toLocaleString() : 0}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              Spent: LKR {t.spentAmount ? Number(t.spentAmount).toLocaleString() : 0}
                            </div>
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            <span className={`badge ${isCompleted ? "badge-success" : "badge-info"}`}>
                              {t.status}
                            </span>
                          </td>

                          <td style={{ padding: "14px 18px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            <div>{t.selectedTransport || "Not chosen"} {t.estimatedDistanceKm ? `(${t.estimatedDistanceKm} km)` : ""}</div>
                            {isCompleted && (
                              <div style={{ color: "var(--success)", fontWeight: 700, marginTop: "2px" }}>
                                {t.completionMethod === "LOCATION" ? "📍 GPS Arrival" : "🏁 Manual"}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: AI WORKFLOW REVIEWS (GOVERNANCE)                  */}
      {/* ======================================================== */}
      {activeTab === "reviews" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ width: "220px" }}>
              <select
                className="auth-input"
                value={workflowStatusFilter}
                onChange={(e) => setWorkflowStatusFilter(e.target.value)}
                style={{ padding: "10px 14px", fontSize: "0.9rem" }}
              >
                <option value="">All Review Statuses</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
            {workflowsLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading AI workflows...
              </div>
            ) : workflows.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No workflows found for the selected filter.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "14px 18px" }}>Workflow ID</th>
                      <th style={{ padding: "14px 18px" }}>Trip Destination</th>
                      <th style={{ padding: "14px 18px" }}>Traveller</th>
                      <th style={{ padding: "14px 18px" }}>Invariants</th>
                      <th style={{ padding: "14px 18px" }}>Status</th>
                      <th style={{ padding: "14px 18px" }}>Reviewer Rationale</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Governance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((wf) => (
                      <tr key={wf.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{ fontWeight: 700, color: "var(--ink)" }}>#{wf.id}</span>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString() : ""}
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wf.destination}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            Trip #{wf.tripId} • LKR {wf.budgetAmount?.toLocaleString()}
                          </div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wf.travellerName}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{wf.travellerEmail}</div>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span className={`badge ${wf.validationPassed ? "badge-success" : "badge-danger"}`}>
                            {wf.validationPassed ? "PASSED" : "FAILED"}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          {getStatusBadge(wf.approvalStatus || wf.status)}
                        </td>

                        <td style={{ padding: "14px 18px", maxWidth: "240px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {wf.approvalComment ? (
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={wf.approvalComment}>
                              "{wf.approvalComment}"
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No notes</span>
                          )}
                          {wf.reviewer && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>By: {wf.reviewer}</div>
                          )}
                        </td>

                        <td style={{ padding: "14px 18px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenReview(wf)}
                            style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                          >
                            ⚖️ Review Plan
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: AUDIT HISTORY TIMELINE                            */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Search audit records by actor, event type, destination, or keyword..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ padding: "10px 14px", fontSize: "0.9rem" }}
              />
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setAuditSearch("")}
            >
              Reset Search
            </button>
          </div>

          <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
            {auditLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading audit trail...
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No audit logs recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "14px 18px" }}>Timestamp</th>
                      <th style={{ padding: "14px 18px" }}>Event Type</th>
                      <th style={{ padding: "14px 18px" }}>Actor</th>
                      <th style={{ padding: "14px 18px" }}>Target</th>
                      <th style={{ padding: "14px 18px" }}>Message / Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 18px", fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                        </td>

                        <td style={{ padding: "14px 18px" }}>
                          <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                            {log.eventType}
                          </span>
                        </td>

                        <td style={{ padding: "14px 18px", fontWeight: 600, color: "var(--ink)" }}>
                          {log.actor || "System"}
                        </td>

                        <td style={{ padding: "14px 18px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {log.aiWorkflowId ? `Workflow #${log.aiWorkflowId}` : "General"}
                          {log.destination && ` (${log.destination})`}
                        </td>

                        <td style={{ padding: "14px 18px", color: "var(--text-primary)", fontSize: "0.85rem" }}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INSPECT USER'S TRIPS                              */}
      {/* ======================================================== */}
      {inspectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setInspectedUser(null)}
        >
          <div
            className="tw-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>🗺️</span> Trips Planned by @{inspectedUser.username}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Role: {inspectedUser.role} • Status: {inspectedUser.isActive ? "Active" : "Deactivated"}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setInspectedUser(null)}
              >
                ✕
              </button>
            </div>

            {tripsLoading ? (
              <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading user trips...</p>
            ) : selectedUserTrips && selectedUserTrips.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "20px 0", fontStyle: "italic" }}>
                This user has not planned any trips yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                {selectedUserTrips?.map((trip) => (
                  <div
                    key={trip.id}
                    style={{
                      padding: "14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-surface-alt)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "1rem", color: "var(--ink)" }}>
                          {trip.startingPlace} ➔ {trip.destination}
                        </strong>
                        <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{trip.status}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        👥 {trip.travellerCount} Travellers • Budget: LKR {trip.budgetAmount?.toLocaleString()}
                        {trip.selectedTransport && ` • Mode: ${trip.selectedTransport}`}
                      </div>
                    </div>

                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REVIEW WORKFLOW GOVERNANCE DECISION               */}
      {/* ======================================================== */}
      {reviewingWorkflow && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setReviewingWorkflow(null)}
        >
          <div
            className="tw-card"
            style={{
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>⚖️</span> Review Plan: Workflow #{reviewingWorkflow.id}
                </h3>
                <span style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>
                  Destination: <strong>{reviewingWorkflow.destination}</strong> • Traveller: <strong>{reviewingWorkflow.travellerName}</strong>
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setReviewingWorkflow(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <span className="badge badge-info">Trip #{reviewingWorkflow.tripId}</span>
                <span className={`badge ${reviewingWorkflow.validationPassed ? "badge-success" : "badge-danger"}`}>
                  Invariants: {reviewingWorkflow.validationPassed ? "PASSED" : "FAILED"}
                </span>
                {getStatusBadge(reviewingWorkflow.approvalStatus || reviewingWorkflow.status)}
              </div>

              {reviewingWorkflow.approvalComment && (
                <div style={{ padding: "12px 16px", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-surface-alt)", marginBottom: "16px", fontSize: "0.88rem" }}>
                  <strong>Current Reviewer Note:</strong> "{reviewingWorkflow.approvalComment}"
                  {reviewingWorkflow.reviewer && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Signed by: {reviewingWorkflow.reviewer}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="admin-review-comment">
                  Governance Evaluation Directive & Feedback:
                </label>
                <textarea
                  id="admin-review-comment"
                  rows={3}
                  className="form-textarea"
                  placeholder="State reason for approval, specific revision requirements, or rejection rationale..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReviewingWorkflow(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleProcessApproval("REJECT")}
                  disabled={reviewProcessing}
                >
                  ✕ Reject Plan
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: "var(--warning)", color: "#ffffff" }}
                  onClick={() => handleProcessApproval("REQUEST_CHANGES")}
                  disabled={reviewProcessing}
                >
                  ↺ Request Changes
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleProcessApproval("APPROVE")}
                  disabled={reviewProcessing}
                >
                  ✓ Approve Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
