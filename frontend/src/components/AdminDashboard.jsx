import { apiFetch as fetch } from "../apiClient";
import { useState, useEffect } from "react";
import { ErrorState, LoadingState, SectionCard, StatCard, StatusBadge } from "./TravelWiseUI";
import { API_BASE_URL } from "../apiConfig";

function AdminDashboard({ user, activeTab: propActiveTab = "admin_dashboard", onNavigateTab, onLogout }) {
  // Map incoming or local tab to one of the 7 Admin areas
  const normalizeTab = (tab) => {
    if (tab === "admin_dashboard" || tab === "overview" || tab === "dashboard" || tab === "admin") return "admin_dashboard";
    if (tab === "admin_travellers" || tab === "users") return "admin_travellers";
    if (tab === "admin_trips" || tab === "trips") return "admin_trips";
    if (tab === "admin_reviews" || tab === "reviews") return "admin_reviews";
    if (tab === "admin_safety" || tab === "safety") return "admin_safety";
    if (tab === "admin_audit" || tab === "audit") return "admin_audit";
    if (tab === "admin_profile" || tab === "profile") return "admin_profile";
    return "admin_dashboard";
  };

  const [currentTab, setCurrentTab] = useState(() => normalizeTab(propActiveTab));

  useEffect(() => {
    if (propActiveTab) {
      setCurrentTab(normalizeTab(propActiveTab));
    }
  }, [propActiveTab]);

  const handleTabChange = (tabId) => {
    setCurrentTab(tabId);
    if (onNavigateTab) {
      onNavigateTab(tabId);
    }
  };

  if (user?.role !== "Admin") {
    return (
      <div className="tw-card" style={{ padding: "40px", textAlign: "center", borderLeft: "4px solid var(--danger)", margin: "32px auto", maxWidth: "600px" }}>
        <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>🛡️ ⛔</div>
        <h2 style={{ color: "var(--danger)", marginBottom: "12px" }}>Administrator Privileges Required</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>
          This workspace is strictly reserved for verified system administrators. Your account does not have authorization to view or manage governance data.
        </p>
      </div>
    );
  }

  // 1. Overview / Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  // 2. Travellers / Users State
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [inspectedUser, setInspectedUser] = useState(null);
  const [selectedUserTrips, setSelectedUserTrips] = useState(null);
  const [tripsLoading, setTripsLoading] = useState(false);

  // 3. Trips State
  const [trips, setTrips] = useState([]);
  const [tripSearch, setTripSearch] = useState("");
  const [tripsFetchLoading, setTripsFetchLoading] = useState(false);
  const [inspectedTrip, setInspectedTrip] = useState(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);

  // 4. AI Workflow Reviews State
  const [workflows, setWorkflows] = useState([]);
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState("");
  const [workflowsLoading, setWorkflowsLoading] = useState(false);
  const [reviewingWorkflow, setReviewingWorkflow] = useState(null);
  const [reviewDetail, setReviewDetail] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewProcessing, setReviewProcessing] = useState(false);

  // 5. Safety & Alerts State
  const [safetyData, setSafetyData] = useState(null);
  const [safetyLoading, setSafetyLoading] = useState(false);

  // 6. Audit History State
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

  // Fetch Operations
  const fetchStats = async () => {
    setStatsLoading(true); setStatsError(""); setStats(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Admin/stats`, { headers: authHeaders });
      if (!res.ok) throw new Error("Admin records are unavailable. Retry to see current information.");
      setStats(await res.json());
    } catch (error) { setStatsError(error.message); }
    finally { setStatsLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams();
      if (userSearch) params.append("search", userSearch);
      if (userRoleFilter) params.append("role", userRoleFilter);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load travellers list.");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setUsersLoading(false);
    }
  };

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

  const fetchSafetyAlerts = async () => {
    try {
      setSafetyLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Admin/safety-alerts`, { headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load safety alerts telemetry.");
      const data = await res.json();
      setSafetyData(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSafetyLoading(false);
    }
  };

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
    if (currentTab === "admin_dashboard") {
      fetchStats();
    } else if (currentTab === "admin_travellers") {
      fetchUsers();
    } else if (currentTab === "admin_trips") {
      fetchTrips();
    } else if (currentTab === "admin_reviews") {
      fetchWorkflows();
    } else if (currentTab === "admin_safety") {
      fetchSafetyAlerts();
    } else if (currentTab === "admin_audit") {
      fetchAuditLogs();
    }
  }, [currentTab, userSearch, userRoleFilter, tripSearch, workflowStatusFilter, auditSearch]);

  // Actions
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

  const handleInspectTraveller = async (targetUser) => {
    try {
      setInspectedUser(targetUser);
      setTripsLoading(true);
      setSelectedUserTrips(null);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users/${targetUser.id}/trips`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Could not load traveller's trips.");
      const data = await res.json();
      setSelectedUserTrips(data.trips || []);
    } catch (err) {
      alert(err.message);
      setInspectedUser(null);
    } finally {
      setTripsLoading(false);
    }
  };

  const handleInspectTrip = async (tripId) => {
    try {
      setTripDetailLoading(true);
      setInspectedTrip(null);

      const res = await fetch(`${API_BASE_URL}/api/Admin/trips/${tripId}`, {
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Could not load deep trip inspection details.");
      const data = await res.json();
      setInspectedTrip(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setTripDetailLoading(false);
    }
  };

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

  const handleProcessApproval = async (decision) => {
    if (!reviewingWorkflow) return;

    // Enforce traveller decision invariant: Admin cannot approve before Traveller acceptance
    if (decision === "APPROVE" && reviewingWorkflow.travellerDecision !== "ACCEPTED") {
      alert("Policy Guard: The traveller must accept the AI plan first before an Administrator can verify and approve it.");
      return;
    }

    const trimmedComment = reviewComment.trim();
    if ((decision === "REQUEST_CHANGES" || decision === "REVISE") && !trimmedComment) {
      alert("A directive comment is required when requesting revisions.");
      return;
    }

    if (decision === "REJECT" && !trimmedComment) {
      alert("A specific reason is required when rejecting a plan.");
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

      setActionMessage(`✓ Successfully recorded governance decision "${decision}" for Workflow #${reviewingWorkflow.id}.`);
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
      case "AWAITING_TRAVELLER_REVIEW":
        return <span className="badge badge-info">AWAITING TRAVELLER</span>;
      case "AWAITING_ADMIN_REVIEW":
        return <span className="badge badge-warning">AWAITING ADMIN</span>;
      default:
        return <span className="badge badge-info">{status || "Not available"}</span>;
    }
  };

  const getRiskBadge = (level, score) => {
    const lvl = (level || "LOW").toUpperCase();
    if (lvl === "HIGH") {
      return <span className="badge badge-danger">⚠️ HIGH ({score ?? 0})</span>;
    }
    if (lvl === "MEDIUM") {
      return <span className="badge badge-warning">⚡ MEDIUM ({score ?? 0})</span>;
    }
    return <span className="badge badge-success">✓ LOW ({score ?? 0})</span>;
  };

  const adminTabsList = [
    { id: "admin_dashboard", label: "Admin Dashboard", icon: "📊", count: null },
    { id: "admin_travellers", label: "Travellers", icon: "👥", count: stats?.totalUsers },
    { id: "admin_trips", label: "Trips", icon: "🗺️", count: stats?.totalTrips },
    { id: "admin_reviews", label: "AI Review Queue", icon: "⚖️", count: stats?.pendingApprovals },
    { id: "admin_safety", label: "Safety & Alerts", icon: "🛡️", count: stats?.highRiskAlerts ? `⚠️ ${stats.highRiskAlerts}` : null },
    { id: "admin_audit", label: "Audit Logs", icon: "📋", count: null },
    { id: "admin_profile", label: "Admin Profile", icon: "👤", count: null },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Workspace Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
            TravelWise Administration & HITL Governance
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
            Operational oversight, traveller accounts, journey telemetry, and Human-in-the-Loop plan verification.
          </p>
        </div>
        <span className="badge badge-ai" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
          🛡️ Institutional Governance: Administrator
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
        {adminTabsList.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
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
              <span>{tab.icon} {tab.label}</span>
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
      {/* 1. ADMIN DASHBOARD & OPERATIONAL OVERVIEW                */}
      {/* ======================================================== */}
      {currentTab === "admin_dashboard" && (
        <div className="tw-admin">
          {statsLoading && <LoadingState label="Loading the operational overview…" />}
          {statsError && <ErrorState message={statsError} onRetry={fetchStats} />}
          {stats && (
            <>
              {/* Stat Cards - Exactly matching existing selectors */}
              <div className="tw-stat-grid">
                <StatCard
                  label="Pending traveller decisions"
                  value={stats.pendingTravellerDecisions}
                  detail="Plans awaiting traveller review or revisions."
                  onClick={() => handleTabChange("admin_reviews")}
                />
                <StatCard
                  label="Pending admin verifications"
                  value={stats.pendingApprovals}
                  detail="Traveller-accepted plans awaiting admin verification."
                  onClick={() => handleTabChange("admin_reviews")}
                />
                <StatCard
                  label="Active trips"
                  value={stats.activeTrips}
                  detail={`${stats.totalTrips} trips registered across all accounts.`}
                  onClick={() => handleTabChange("admin_trips")}
                />
                <StatCard
                  label="Users"
                  value={stats.totalUsers}
                  detail={`${stats.activeUsers} active accounts · ${stats.travellerUsers} travellers`}
                  onClick={() => handleTabChange("admin_travellers")}
                />
                <StatCard
                  label="Workflow status"
                  value={stats.totalWorkflows}
                  detail="Persisted planning workflows across the service."
                  onClick={() => handleTabChange("admin_reviews")}
                />
                <StatCard
                  label="System health"
                  value={stats.databaseReachable ? "Database reachable" : "Not available"}
                  detail={`Last successful overview read: ${new Date(stats.capturedAt).toLocaleString()}. Telemetry checked when requested.`}
                />
              </div>

              {/* Quick Operational Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", margin: "16px 0" }}>
                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid var(--teal)", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Upcoming Journeys</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)", margin: "4px 0" }}>{stats.upcomingTrips ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Scheduled future departures across travellers.</div>
                </div>
                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid #10b981", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Completed Journeys</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)", margin: "4px 0" }}>{stats.completedTrips ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Successfully completed travel journeys.</div>
                </div>
                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: stats.highRiskAlerts > 0 ? "4px solid var(--danger)" : "4px solid var(--border-color)", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>High-Risk Telemetry Alerts</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: stats.highRiskAlerts > 0 ? "var(--danger)" : "var(--ink)", margin: "4px 0" }}>{stats.highRiskAlerts ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Trips requiring elevated weather or safety monitoring.</div>
                </div>
              </div>

              {/* Operational Lists: Upcoming Trips */}
              <div className="tw-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>🗓️ Upcoming Scheduled Trips</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>Next departures across registered travellers.</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleTabChange("admin_trips")}>
                    View All Trips →
                  </button>
                </div>

                {stats.upcomingTripsList?.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "10px 14px" }}>Route</th>
                          <th style={{ padding: "10px 14px" }}>Traveller</th>
                          <th style={{ padding: "10px 14px" }}>Departure Date</th>
                          <th style={{ padding: "10px 14px" }}>Party</th>
                          <th style={{ padding: "10px 14px" }}>Budget</th>
                          <th style={{ padding: "10px 14px" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.upcomingTripsList.map((t) => (
                          <tr key={t.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--ink)" }}>{t.startingPlace} → {t.destination}</td>
                            <td style={{ padding: "10px 14px", color: "var(--text-secondary)" }}>{t.ownerName}</td>
                            <td style={{ padding: "10px 14px" }}>{t.startDate ? new Date(t.startDate).toLocaleDateString() : "TBD"}</td>
                            <td style={{ padding: "10px 14px" }}>{t.travellerCount} travellers</td>
                            <td style={{ padding: "10px 14px", color: "var(--teal)", fontWeight: 600 }}>LKR {t.budgetAmount?.toLocaleString()}</td>
                            <td style={{ padding: "10px 14px" }}><span className="badge badge-info" style={{ fontSize: "0.72rem" }}>{t.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>No upcoming trips scheduled.</p>
                )}
              </div>

              {/* Operational Lists: Pending AI Reviews */}
              <div className="tw-card" style={{ padding: "20px", marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>⚖️ Plans Awaiting Administrator Verification</h3>
                    <p style={{ margin: "2px 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>Plans accepted by travellers pending institutional verification.</p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => handleTabChange("admin_reviews")}>
                    Open Review Queue →
                  </button>
                </div>

                {stats.pendingReviewsList?.length ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "10px 14px" }}>Workflow ID</th>
                          <th style={{ padding: "10px 14px" }}>Destination</th>
                          <th style={{ padding: "10px 14px" }}>Traveller</th>
                          <th style={{ padding: "10px 14px" }}>Invariants</th>
                          <th style={{ padding: "10px 14px" }}>Traveller Acceptance</th>
                          <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.pendingReviewsList.map((rev) => (
                          <tr key={rev.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>#{rev.id}</td>
                            <td style={{ padding: "10px 14px", fontWeight: 600 }}>{rev.destination}</td>
                            <td style={{ padding: "10px 14px" }}>{rev.travellerName}</td>
                            <td style={{ padding: "10px 14px" }}>
                              <span className={`badge ${rev.validationPassed ? "badge-success" : "badge-danger"}`} style={{ fontSize: "0.72rem" }}>
                                {rev.validationPassed ? "PASSED" : "FAILED"}
                              </span>
                            </td>
                            <td style={{ padding: "10px 14px" }}>
                              <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>✓ ACCEPTED</span>
                            </td>
                            <td style={{ padding: "10px 14px", textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => {
                                  handleTabChange("admin_reviews");
                                  handleOpenReview(rev);
                                }}
                                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                              >
                                Review Plan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>No plans currently awaiting admin verification.</p>
                )}
              </div>

              {/* Status Section Card */}
              <SectionCard eyebrow="Planning operations" title="Workflow status">
                <div className="tw-admin-statuses">
                  {stats.workflowStatuses?.length ? (
                    stats.workflowStatuses.map((row) => (
                      <StatusBadge key={row.status}>{`${row.status.replaceAll("_", " ")} · ${row.count}`}</StatusBadge>
                    ))
                  ) : (
                    <p>No workflows recorded yet.</p>
                  )}
                </div>
              </SectionCard>

              {/* Audit History Card */}
              <SectionCard
                eyebrow="Recent decisions"
                title="Audit history"
                action={<button className="tw-text-button" onClick={() => handleTabChange("admin_audit")}>View history →</button>}
              >
                {stats.latestAudit?.length ? (
                  <ul className="tw-audit-list">
                    {stats.latestAudit.map((log) => (
                      <li key={log.id}>
                        <StatusBadge>{log.eventType}</StatusBadge>
                        <p>{log.message}</p>
                        <small>{log.actor} · {new Date(log.createdAt).toLocaleString()}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No audit events recorded yet.</p>
                )}
              </SectionCard>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TRAVELLERS REGISTRY                                   */}
      {/* ======================================================== */}
      {currentTab === "admin_travellers" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "240px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Search by username, full name, or email..."
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

          <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
            {usersLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading traveller accounts...
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                No traveller accounts found matching your query.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "14px 18px" }}>Traveller</th>
                      <th style={{ padding: "14px 18px" }}>Role</th>
                      <th style={{ padding: "14px 18px" }}>Travel Preferences</th>
                      <th style={{ padding: "14px 18px" }}>Trips</th>
                      <th style={{ padding: "14px 18px" }}>Account Status</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Governance Actions</th>
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
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  Pace: {u.activityPace || "Moderate"}
                                </div>
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
                                onClick={() => handleInspectTraveller(u)}
                                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                              >
                                Inspect Traveller
                              </button>

                              {!isSelf && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => handleToggleStatus(u)}
                                  style={{
                                    fontSize: "0.78rem",
                                    padding: "4px 10px",
                                    backgroundColor: u.isActive ? "var(--danger-bg)" : "var(--success-bg)",
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
      {/* 3. TRIPS DATABASE & DEEP INSPECTION                      */}
      {/* ======================================================== */}
      {currentTab === "admin_trips" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: "260px" }}>
              <input
                type="text"
                className="auth-input"
                placeholder="Filter trips by destination, starting place, or traveller name..."
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
                      <th style={{ padding: "14px 18px" }}>Traveller</th>
                      <th style={{ padding: "14px 18px" }}>Dates & Party</th>
                      <th style={{ padding: "14px 18px" }}>Budget & Spent</th>
                      <th style={{ padding: "14px 18px" }}>Risk Telemetry</th>
                      <th style={{ padding: "14px 18px" }}>Workflow State</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Inspect</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((t) => {
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
                            {getRiskBadge(t.risk?.riskLevel, t.risk?.riskScore)}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            {getStatusBadge(t.workflow?.approvalStatus || t.workflow?.workflowStatus || t.status)}
                          </td>

                          <td style={{ padding: "14px 18px", textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleInspectTrip(t.id)}
                              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                            >
                              Inspect Trip
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. AI REVIEW QUEUE (HITL GOVERNANCE)                     */}
      {/* ======================================================== */}
      {currentTab === "admin_reviews" && (
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
                <option value="PENDING_ADMIN">Awaiting Admin Verification</option>
                <option value="APPROVED">Approved Plans</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="REJECTED">Rejected Plans</option>
              </select>
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "auto" }}>
              Sequence: <strong style={{ color: "var(--teal)" }}>AI recommends → Rules validate → Traveller decides → Admin verifies</strong>
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
                      <th style={{ padding: "14px 18px" }}>Rules & Invariants</th>
                      <th style={{ padding: "14px 18px" }}>Traveller Decision</th>
                      <th style={{ padding: "14px 18px" }}>Admin Status</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Governance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((wf) => {
                      const isTravellerAccepted = wf.travellerDecision === "ACCEPTED";

                      return (
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
                            {isTravellerAccepted ? (
                              <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                                ✓ ACCEPTED
                              </span>
                            ) : wf.travellerDecision === "CHANGES_REQUESTED" ? (
                              <span className="badge badge-warning" style={{ fontSize: "0.75rem" }}>
                                ↺ REVISION REQUESTED
                              </span>
                            ) : wf.travellerDecision === "REJECTED" ? (
                              <span className="badge badge-danger" style={{ fontSize: "0.75rem" }}>
                                ✕ REJECTED
                              </span>
                            ) : (
                              <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                                AWAITING TRAVELLER
                              </span>
                            )}
                          </td>

                          <td style={{ padding: "14px 18px" }}>
                            {getStatusBadge(wf.approvalStatus || wf.status)}
                          </td>

                          <td style={{ padding: "14px 18px", textAlign: "right" }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => handleOpenReview(wf)}
                              style={{ fontSize: "0.8rem", padding: "4px 12px" }}
                            >
                              ⚖️ Review & Decide
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
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SAFETY & ALERTS TELEMETRY                             */}
      {/* ======================================================== */}
      {currentTab === "admin_safety" && (
        <div>
          {safetyLoading && <LoadingState label="Loading Open-Meteo safety alerts telemetry..." />}

          {safetyData && (
            <>
              {/* Risk Distribution Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid var(--ink)", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Total Assessed Trips</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--ink)", margin: "4px 0" }}>{safetyData.totalAssessed ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Trips with weather risk evaluations.</div>
                </div>

                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid var(--danger)", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>High-Risk Trips</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--danger)", margin: "4px 0" }}>{safetyData.highRiskCount ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Critical hazard advisories active.</div>
                </div>

                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid var(--warning)", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Medium-Risk Trips</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#d97706", margin: "4px 0" }}>{safetyData.mediumRiskCount ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Elevated rain or wind telemetry.</div>
                </div>

                <div className="tw-card" style={{ padding: "18px 20px", borderLeft: "4px solid #10b981", margin: 0 }}>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Low-Risk Trips</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#10b981", margin: "4px 0" }}>{safetyData.lowRiskCount ?? 0}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Optimal weather and terrain conditions.</div>
                </div>
              </div>

              {/* Alert Banner if High Risk Exists */}
              {safetyData.highRiskCount > 0 && (
                <div style={{ padding: "16px 20px", backgroundColor: "var(--danger-bg)", borderLeft: "5px solid var(--danger)", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--danger)", fontWeight: 700, fontSize: "1rem" }}>
                    <span>🚨 Elevated Travel Risk Alert</span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    {safetyData.highRiskCount} journey(s) require operational safety monitoring due to severe weather, torrential rain, or adverse terrain conditions.
                  </p>
                </div>
              )}

              {/* Safety Telemetry Table */}
              <div className="tw-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-surface-alt)" }}>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--ink)" }}>Assessed Journeys Telemetry</h3>
                </div>

                {safetyData.alerts?.length === 0 ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    No safety assessments recorded yet.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "14px 18px" }}>Trip Destination</th>
                          <th style={{ padding: "14px 18px" }}>Traveller</th>
                          <th style={{ padding: "14px 18px" }}>Risk Classification</th>
                          <th style={{ padding: "14px 18px" }}>Weather Telemetry</th>
                          <th style={{ padding: "14px 18px" }}>Safety Advisory</th>
                          <th style={{ padding: "14px 18px" }}>Assessed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safetyData.alerts.map((alert) => (
                          <tr key={alert.tripId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "14px 18px" }}>
                              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{alert.destination}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Trip #{alert.tripId}</div>
                            </td>

                            <td style={{ padding: "14px 18px" }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{alert.ownerName}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{alert.ownerEmail}</div>
                            </td>

                            <td style={{ padding: "14px 18px" }}>
                              {getRiskBadge(alert.riskLevel, alert.riskScore)}
                            </td>

                            <td style={{ padding: "14px 18px", fontSize: "0.84rem" }}>
                              <div>🌡️ {alert.temperatureC != null ? `${alert.temperatureC}°C` : "N/A"} • {alert.weatherCondition || "Clear"}</div>
                              {alert.rainfallMm != null && <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>Rainfall: {alert.rainfallMm} mm</div>}
                            </td>

                            <td style={{ padding: "14px 18px", fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "260px" }}>
                              {alert.summary || "Conditions optimal for planned travel."}
                            </td>

                            <td style={{ padding: "14px 18px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {alert.assessedAt ? new Date(alert.assessedAt).toLocaleString() : "Recent"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. AUDIT LOGS (GOVERNANCE TIMELINE)                      */}
      {/* ======================================================== */}
      {currentTab === "admin_audit" && (
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
                No audit events recorded yet.
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
      {/* 7. ADMIN PROFILE & PRIVILEGES                            */}
      {/* ======================================================== */}
      {currentTab === "admin_profile" && (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div className="tw-card" style={{ padding: "32px", borderLeft: "5px solid var(--teal)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  backgroundColor: "var(--ink)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: 700,
                }}
              >
                {(user.fullName || user.username || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "var(--ink)" }}>
                  {user.fullName || user.username}
                </h3>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  @{user.username} • {user.email}
                </div>
              </div>
              <span className="badge badge-ai" style={{ marginLeft: "auto", fontSize: "0.85rem" }}>
                🛡️ Role: Administrator
              </span>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", marginBottom: "24px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "1rem", color: "var(--ink)" }}>Administrator Governance Privileges:</h4>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.8" }}>
                <li>✓ Full Institutional Human-in-the-Loop (HITL) Workflow Verification</li>
                <li>✓ System-wide Trip Database & Expense Lifecycle Inspection</li>
                <li>✓ Traveller Account Activation & Registry Governance</li>
                <li>✓ Real-time Open-Meteo Weather & Environmental Risk Telemetry</li>
                <li>✓ Immutable System Audit Trail Review</li>
              </ul>
            </div>

            <div style={{ padding: "14px 18px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)", marginBottom: "24px", fontSize: "0.86rem", color: "var(--text-secondary)", border: "1px dashed var(--border-color)" }}>
              🔒 <strong>Institutional Scope Notice:</strong> Administrator accounts are configured exclusively for operations, safety monitoring, and governance verification. Traveller personal itinerary planning tools are intentionally partitioned to Traveller accounts.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  if (onLogout) onLogout();
                  else window.location.href = "/login";
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: INSPECT TRAVELLER DETAILS & PREFERENCES         */}
      {/* ======================================================== */}
      {inspectedUser && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "20px",
          }}
          onClick={() => setInspectedUser(null)}
        >
          <div
            className="tw-card"
            style={{
              width: "100%", maxWidth: "680px", maxHeight: "88vh",
              overflowY: "auto", boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>👤</span> Traveller Profile: {inspectedUser.fullName || inspectedUser.username}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  @{inspectedUser.username} • {inspectedUser.email}
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

            {/* Traveller Preferences Summary */}
            <div style={{ padding: "16px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--ink)" }}>🎯 Travel Preferences & Pacing</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", fontSize: "0.85rem" }}>
                <div>Style: <strong>{inspectedUser.travelStyle || "Balanced"}</strong></div>
                <div>Budget Style: <strong>{inspectedUser.budgetStyle || "Moderate"}</strong></div>
                <div>Activity Pace: <strong>{inspectedUser.activityPace || "Moderate"}</strong></div>
                <div>Interests: <strong>{inspectedUser.interests || "General"}</strong></div>
                <div>Transport: <strong>{inspectedUser.transportPreference || "Any"}</strong></div>
                <div>Onboarded: <strong>{inspectedUser.hasCompletedOnboarding ? "Yes" : "Pending"}</strong></div>
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--ink)" }}>🗺️ Planned Journeys ({selectedUserTrips?.length ?? 0})</h4>

            {tripsLoading ? (
              <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading traveller trips...</p>
            ) : selectedUserTrips && selectedUserTrips.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "20px 0", fontStyle: "italic" }}>
                This traveller has not planned any trips yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedUserTrips?.map((trip) => (
                  <div
                    key={trip.id}
                    style={{
                      padding: "14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-surface)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>
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
      {/* MODAL 2: INSPECT TRIP DEEP DETAILS                       */}
      {/* ======================================================== */}
      {inspectedTrip && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "20px",
          }}
          onClick={() => setInspectedTrip(null)}
        >
          <div
            className="tw-card"
            style={{
              width: "100%", maxWidth: "760px", maxHeight: "88vh",
              overflowY: "auto", boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>🗺️</span> Deep Trip Inspection: #{inspectedTrip.trip.id} ({inspectedTrip.trip.startingPlace} ➔ {inspectedTrip.trip.destination})
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Traveller: <strong>{inspectedTrip.owner?.fullName || inspectedTrip.owner?.username}</strong> ({inspectedTrip.owner?.email})
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setInspectedTrip(null)}
              >
                ✕
              </button>
            </div>

            {/* Trip Specs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "20px", padding: "14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)", fontSize: "0.85rem" }}>
              <div>📅 Dates: <strong>{inspectedTrip.trip.startDate?.slice(0, 10)} → {inspectedTrip.trip.returnDate?.slice(0, 10)}</strong></div>
              <div>👥 Travellers: <strong>{inspectedTrip.trip.travellerCount}</strong></div>
              <div>🚗 Transport: <strong>{inspectedTrip.trip.selectedTransport || "Not chosen"}</strong></div>
              <div>🏁 Status: <strong>{inspectedTrip.trip.status}</strong></div>
              <div>💰 Allocated Budget: <strong>LKR {inspectedTrip.trip.budgetAmount?.toLocaleString()}</strong></div>
              <div>💳 Total Spent: <strong>LKR {inspectedTrip.trip.spentAmount?.toLocaleString()}</strong></div>
            </div>

            {/* Risk & Safety Telemetry */}
            <div style={{ marginBottom: "20px", padding: "14px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--ink)" }}>🛡️ Risk & Weather Telemetry</h4>
                {getRiskBadge(inspectedTrip.riskAssessment?.riskLevel, inspectedTrip.riskAssessment?.riskScore)}
              </div>
              <p style={{ margin: "0 0 6px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {inspectedTrip.riskAssessment?.weatherSummary || "Weather telemetry within acceptable operating bounds."}
              </p>
              {inspectedTrip.riskAssessment?.advisories && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Advisory: {inspectedTrip.riskAssessment.advisories}
                </div>
              )}
            </div>

            {/* Budget & Expenses Breakdown */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--ink)" }}>💳 Recorded Expenses ({inspectedTrip.budget?.expenses?.length ?? 0})</h4>
              {inspectedTrip.budget?.expenses?.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--bg-surface-alt)", textAlign: "left", color: "var(--text-muted)" }}>
                        <th style={{ padding: "8px 12px" }}>Description</th>
                        <th style={{ padding: "8px 12px" }}>Category</th>
                        <th style={{ padding: "8px 12px" }}>Amount</th>
                        <th style={{ padding: "8px 12px" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectedTrip.budget.expenses.map((exp) => (
                        <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{exp.description}</td>
                          <td style={{ padding: "8px 12px" }}>{exp.categoryName || "General"}</td>
                          <td style={{ padding: "8px 12px", color: "var(--teal)", fontWeight: 600 }}>LKR {exp.amount?.toLocaleString()}</td>
                          <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>{exp.expenseDate?.slice(0, 10)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", fontStyle: "italic", margin: 0 }}>No expenses recorded yet.</p>
              )}
            </div>

            {/* Scheduled Activities */}
            <div style={{ marginBottom: "10px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--ink)" }}>🗓️ Scheduled Activities ({inspectedTrip.activities?.length ?? 0})</h4>
              {inspectedTrip.activities?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {inspectedTrip.activities.map((act) => (
                    <div key={act.id} style={{ padding: "10px 14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", fontSize: "0.84rem" }}>
                      <div>
                        <strong>{act.name}</strong> • {act.category || "Sightseeing"}
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{act.locationName}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div>LKR {act.cost?.toLocaleString() || 0}</div>
                        <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{act.scheduledDate?.slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", fontStyle: "italic", margin: 0 }}>No activities scheduled yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: REVIEW WORKFLOW GOVERNANCE DECISION             */}
      {/* ======================================================== */}
      {reviewingWorkflow && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: "20px",
          }}
          onClick={() => setReviewingWorkflow(null)}
        >
          <div
            className="tw-card"
            style={{
              width: "100%", maxWidth: "740px", maxHeight: "90vh",
              overflowY: "auto", boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>⚖️</span> HITL Plan Verification: Workflow #{reviewingWorkflow.id}
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

            {/* TravelWise HITL Protocol Reminder */}
            <div style={{ padding: "10px 14px", backgroundColor: "var(--primary-light)", borderLeft: "4px solid var(--teal)", borderRadius: "var(--radius-sm)", marginBottom: "16px", fontSize: "0.85rem", color: "var(--ink)" }}>
              <strong>Institutional Policy:</strong> AI recommends. Deterministic rules validate. The traveller decides first. The admin verifies second.
            </div>

            {/* Traveller Decision Status */}
            <div style={{ padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", backgroundColor: reviewingWorkflow.travellerDecision === "ACCEPTED" ? "var(--success-bg)" : "#fffdf5", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--ink)" }}>
                  1. Traveller Decision Status:
                </span>
                {reviewingWorkflow.travellerDecision === "ACCEPTED" ? (
                  <span className="badge badge-success">✓ ACCEPTED BY TRAVELLER</span>
                ) : reviewingWorkflow.travellerDecision === "CHANGES_REQUESTED" ? (
                  <span className="badge badge-warning">↺ REVISION REQUESTED</span>
                ) : reviewingWorkflow.travellerDecision === "REJECTED" ? (
                  <span className="badge badge-danger">✕ REJECTED BY TRAVELLER</span>
                ) : (
                  <span className="badge badge-info">AWAITING TRAVELLER REVIEW</span>
                )}
              </div>

              {reviewingWorkflow.travellerDecision === "ACCEPTED" ? (
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--success)" }}>
                  ✓ The traveller reviewed and accepted this itinerary plan. Ready for administrator verification.
                  {reviewingWorkflow.travellerComment && <span> Note: "{reviewingWorkflow.travellerComment}"</span>}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: "0.86rem", color: "#b45309" }}>
                  ⚠️ <strong>Traveller Decision Pending:</strong> The traveller has not accepted this plan. Administrator approval is disabled until traveller acceptance is recorded.
                </p>
              )}
            </div>

            {/* Deterministic Invariants Check */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px", padding: "10px 14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
              <span>Deterministic Invariants:</span>
              <span className={`badge ${reviewingWorkflow.validationPassed ? "badge-success" : "badge-danger"}`}>
                {reviewingWorkflow.validationPassed ? "✓ ALL INVARIANTS PASSED" : "✕ INVARIANTS FAILED"}
              </span>
            </div>

            {/* AI Agent Evaluations (Clean, structured, NO chain-of-thought) */}
            {reviewDetail?.agentResults && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", color: "var(--ink)" }}>🧠 Structured Agent Evaluations</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                  <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>💳 Budget Agent</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Budget: LKR {reviewDetail.agentResults.budget?.total_budget?.toLocaleString()}
                      <div>Spent: LKR {reviewDetail.agentResults.budget?.total_spent?.toLocaleString()}</div>
                      <div>Health: <strong>{reviewDetail.agentResults.budget?.health || "HEALTHY"}</strong></div>
                    </div>
                  </div>

                  <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>🗓️ Activity Agent</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Activities: <strong>{reviewDetail.agentResults.activity?.activity_count ?? 0} planned</strong>
                      <div>Pacing: {reviewDetail.agentResults.activity?.recommendation || "Balanced"}</div>
                    </div>
                  </div>

                  <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>🛡️ Risk Agent</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Risk Level: <strong>{reviewDetail.agentResults.risk?.risk_level || "LOW"}</strong>
                      <div>Score: {reviewDetail.agentResults.risk?.risk_score ?? 0} / 100</div>
                    </div>
                  </div>

                  <div style={{ padding: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "4px" }}>📋 Readiness Agent</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Readiness: <strong>{reviewDetail.agentResults.readiness?.readiness_level || "READY"}</strong>
                      <div>Compliance: {reviewDetail.agentResults.readiness?.readiness_score ?? 100}%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Directive Feedback Box */}
            <div className="form-group" style={{ marginBottom: "18px" }}>
              <label className="form-label" htmlFor="admin-review-comment">
                2. Administrator Governance Directive & Feedback:
              </label>
              <textarea
                id="admin-review-comment"
                rows={3}
                className="form-textarea"
                placeholder="State verification confirmation, specific revision requirements, or rejection rationale..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
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
                disabled={reviewProcessing || reviewingWorkflow.travellerDecision !== "ACCEPTED"}
                title={reviewingWorkflow.travellerDecision !== "ACCEPTED" ? "Admin verification requires prior acceptance by the traveller." : "Verify and approve this travel plan"}
              >
                ✓ Verify & Approve Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
