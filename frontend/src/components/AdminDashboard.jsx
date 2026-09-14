import { useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";

function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Inspect user trips modal state
  const [selectedUserTrips, setSelectedUserTrips] = useState(null);
  const [inspectedUser, setInspectedUser] = useState(null);
  const [tripsLoading, setTripsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (roleFilter) params.append("role", roleFilter);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });

      if (!res.ok) throw new Error("Failed to load users. Ensure you have Admin privileges.");

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Admin/stats`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn("Failed to load admin stats:", e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [search, roleFilter]);

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
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

  const handleInspectTrips = async (targetUser) => {
    try {
      setInspectedUser(targetUser);
      setTripsLoading(true);
      setSelectedUserTrips(null);

      const res = await fetch(`${API_BASE_URL}/api/Admin/users/${targetUser.id}/trips`, {
        headers: { Authorization: `Bearer ${user?.token}` },
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <h2 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 4px" }}>
            Admin & System Governance Workspace
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            Inspect user registries, manage account permissions, and review cross-platform travel telemetries.
          </p>
        </div>
        <span className="badge badge-ai" style={{ fontSize: "0.85rem", padding: "6px 14px" }}>
          🛡️ Authorized: Administrator
        </span>
      </div>

      {/* Action / Error Alerts */}
      {actionMessage && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#dcfce7", color: "#15803d", borderLeft: "4px solid #22c55e", fontSize: "0.9rem" }}>
          {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", borderLeft: "4px solid #ef4444", fontSize: "0.9rem" }}>
          {errorMessage}
        </div>
      )}

      {/* System Telemetry Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Accounts</span>
            <span>👥</span>
          </div>
          <div className="kpi-value">{stats?.totalUsers ?? users.length}</div>
          <div className="kpi-subtext">Registered across TravelWise</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Active Travellers</span>
            <span>🟢</span>
          </div>
          <div className="kpi-value">{stats?.activeUsers ?? 0}</div>
          <div className="kpi-subtext">{stats?.travellerUsers ?? 0} with Traveller role</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Planned Trips</span>
            <span>🗺️</span>
          </div>
          <div className="kpi-value">{stats?.totalTrips ?? 0}</div>
          <div className="kpi-subtext">Across Sri Lanka destinations</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Budget Volume</span>
            <span>💳</span>
          </div>
          <div className="kpi-value">
            LKR {stats?.totalAllocatedBudget ? Math.round(stats.totalAllocatedBudget).toLocaleString() : "0"}
          </div>
          <div className="kpi-subtext">Total allocated travel capital</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="tw-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              className="auth-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, or full name..."
              style={{ padding: "8px 12px", fontSize: "0.9rem" }}
            />
          </div>

          <div style={{ width: "180px" }}>
            <select
              className="auth-input"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ padding: "8px 12px", fontSize: "0.9rem" }}
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
              setSearch("");
              setRoleFilter("");
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="tw-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            User Accounts Registry ({users.length})
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Real PostgreSQL Accounts
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            Loading users from database...
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
                  <th style={{ padding: "12px 16px" }}>User</th>
                  <th style={{ padding: "12px 16px" }}>Role</th>
                  <th style={{ padding: "12px 16px" }}>Preferences</th>
                  <th style={{ padding: "12px 16px" }}>Trips</th>
                  <th style={{ padding: "12px 16px" }}>Account Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === user?.id;

                  return (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.15s" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                          {u.fullName || u.username} {isSelf && <span style={{ fontSize: "0.72rem", color: "var(--secondary)" }}>(You)</span>}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          @{u.username} • {u.email}
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className={`badge ${
                            u.role === "Admin"
                              ? "badge-ai"
                              : u.role === "Reviewer"
                              ? "badge-warning"
                              : "badge-info"
                          }`}
                          style={{ fontSize: "0.74rem" }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {u.travelStyle ? (
                          <div>
                            <strong>{u.travelStyle}</strong> • {u.budgetStyle || "Balanced"}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not onboarded</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{u.tripCount}</span> trips
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className={`badge ${u.isActive ? "badge-success" : "badge-danger"}`}
                          style={{ fontSize: "0.75rem" }}
                        >
                          {u.isActive ? "ACTIVE" : "DEACTIVATED"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleInspectTrips(u)}
                            style={{ fontSize: "0.78rem", padding: "4px 8px" }}
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
                                padding: "4px 8px",
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

      {/* Modal for User's Trips */}
      {inspectedUser && (
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
              boxShadow: "var(--shadow-xl)",
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
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-surface-alt)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "1rem" }}>
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
    </div>
  );
}

export default AdminDashboard;
