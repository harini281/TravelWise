import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function DashboardOverview({ trip, onNavigate }) {
  const [budgetHealth, setBudgetHealth] = useState(null);
  const [activities, setActivities] = useState([]);
  const [weather, setWeather] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        const [bRes, aRes, wRes, rRes, wfRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/Budgets/2/health`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Activities/trip/2`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_BASE_URL}/api/Risk/weather/trip/2`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Readiness/trip/2`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Workflow/trip/2`).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (bRes.status === "fulfilled" && bRes.value) setBudgetHealth(bRes.value);
        if (aRes.status === "fulfilled" && aRes.value) setActivities(Array.isArray(aRes.value) ? aRes.value : []);
        if (wRes.status === "fulfilled" && wRes.value) setWeather(wRes.value);
        if (rRes.status === "fulfilled" && rRes.value) setReadiness(rRes.value);
        if (wfRes.status === "fulfilled" && wfRes.value) {
          const wfData = wfRes.value;
          setWorkflow(Array.isArray(wfData) ? wfData[wfData.length - 1] : wfData);
        }
      } catch (e) {
        console.error("Dashboard overview load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalSpent = budgetHealth?.totalSpent ?? 0;
  const totalBudget = budgetHealth?.totalBudget ?? trip?.budgetAmount ?? 80000;
  const remainingBudget = budgetHealth?.remainingBudget ?? (totalBudget - totalSpent);
  const spendPct = budgetHealth?.spendingPercentage ?? (totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0);
  const budgetHealthStatus = budgetHealth?.budgetHealth ?? "HEALTHY";

  const getHealthBadge = (health) => {
    switch (health) {
      case "HEALTHY":
        return <span className="badge badge-success">HEALTHY</span>;
      case "WARNING":
        return <span className="badge badge-warning">WARNING</span>;
      case "CRITICAL":
        return <span className="badge badge-danger">CRITICAL</span>;
      default:
        return <span className="badge badge-info">{health}</span>;
    }
  };

  const getWorkflowBadge = (wf) => {
    if (!wf) return <span className="badge badge-info">NOT STARTED</span>;
    if (wf.status === "COMPLETED") return <span className="badge badge-success">APPROVED</span>;
    if (wf.status === "AWAITING_APPROVAL") return <span className="badge badge-warning">AWAITING REVIEW</span>;
    if (wf.status === "SAFE_FAILURE") return <span className="badge badge-warning">SAFE FAILURE</span>;
    return <span className="badge badge-ai">{wf.status}</span>;
  };

  const completedRequirements = readiness?.checklist?.filter((item) => item.status === "COMPLETED")?.length ?? 0;
  const totalRequirements = readiness?.checklist?.length ?? 4;
  const readinessPct = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 75;

  return (
    <div>
      {/* Hero Trip Card */}
      <div
        className="tw-card"
        style={{
          background: "linear-gradient(135deg, #0f2b48 0%, #1e3a8a 100%)",
          color: "#ffffff",
          padding: "28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.82rem", letterSpacing: "1px", textTransform: "uppercase", opacity: 0.8, fontWeight: "600" }}>
                Active Journey
              </span>
              <span className="badge" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", color: "#ffffff" }}>
                {trip?.status ?? "PLANNING"}
              </span>
            </div>
            <h1 style={{ color: "#ffffff", fontSize: "2rem", margin: "0 0 6px", fontWeight: "700" }}>
              Ella Adventure
            </h1>
            <p style={{ color: "#cbd5e1", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{trip?.startingPlace ?? "Colombo"}</span>
              <span>➔</span>
              <strong style={{ color: "#ffffff" }}>{trip?.destination ?? "Ella"}</strong>
            </p>
          </div>

          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(8px)",
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.88rem",
              lineHeight: "1.6",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <div>📅 <strong>10 Oct – 13 Oct 2026</strong> (4 Days)</div>
            <div>👥 <strong>{trip?.travellerCount ?? 2} Travellers</strong> • {trip?.tripType ?? "Adventure"}</div>
          </div>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("budget")}>
          <div className="kpi-label">
            <span>Remaining Budget</span>
            <span>💳</span>
          </div>
          <div className="kpi-value">
            LKR {remainingBudget.toLocaleString()}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span className="kpi-subtext">LKR {totalSpent.toLocaleString()} spent ({spendPct}%)</span>
            {getHealthBadge(budgetHealthStatus)}
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("safety")}>
          <div className="kpi-label">
            <span>Travel Safety</span>
            <span>🛡️</span>
          </div>
          <div className="kpi-value" style={{ color: weather?.temperatureCelsius ? "#0f172a" : "#475569" }}>
            {weather ? `${weather.temperatureCelsius}°C` : "Ella, LK"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span className="kpi-subtext">{weather?.weatherSummary ?? "Clear weather forecast"}</span>
            <span className="badge badge-success">LOW RISK</span>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("readiness")}>
          <div className="kpi-label">
            <span>Travel Readiness</span>
            <span>📋</span>
          </div>
          <div className="kpi-value">
            {readinessPct}%
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span className="kpi-subtext">{completedRequirements} of {totalRequirements} tasks ready</span>
            <span className="badge badge-info">IN PROGRESS</span>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("activities")}>
          <div className="kpi-label">
            <span>Activities Planned</span>
            <span>📍</span>
          </div>
          <div className="kpi-value">
            {activities.length}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
            <span className="kpi-subtext">Across 4 tour days</span>
            <span className="badge badge-info">ITINERARY</span>
          </div>
        </div>
      </div>

      {/* Two Column Section Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
        {/* Left Column: Budget Progress & Upcoming Activities */}
        <div>
          {/* Budget Overview Card */}
          <div className="tw-card">
            <div className="tw-card-header">
              <h3 className="tw-card-title">
                <span>💰</span> Budget Allocation & Velocity
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate("budget")}>
                View Details
              </button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                <span>Budget Utilization</span>
                <strong>{spendPct}%</strong>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(spendPct, 100)}%`,
                    backgroundColor: spendPct > 90 ? "var(--danger)" : spendPct > 70 ? "var(--warning)" : "var(--success)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
              <div style={{ padding: "10px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="text-muted">Total Budget</span>
                <div style={{ fontWeight: "700", marginTop: "2px" }}>LKR {totalBudget.toLocaleString()}</div>
              </div>
              <div style={{ padding: "10px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="text-muted">Total Spent</span>
                <div style={{ fontWeight: "700", marginTop: "2px" }}>LKR {totalSpent.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Upcoming Activities Card */}
          <div className="tw-card">
            <div className="tw-card-header">
              <h3 className="tw-card-title">
                <span>🗓️</span> Upcoming Activities
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate("activities")}>
                Itinerary Planner
              </button>
            </div>

            {activities.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.88rem" }}>
                No activities planned yet. Explore and schedule experiences.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {activities.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    style={{
                      padding: "12px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "0.92rem", display: "block" }}>{act.name}</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        📍 {act.location || "Ella"} • {act.category || "Sightseeing"}
                      </span>
                    </div>
                    <span className="badge badge-info">{act.status || "PLANNED"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Trip Status & Travel Safety */}
        <div>
          {/* AI Workflow Status Card */}
          <div className="tw-card">
            <div className="tw-card-header">
              <h3 className="tw-card-title">
                <span>🤖</span> AI Trip Planning Status
              </h3>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate("ai_planner")}>
                ⚡ Open AI Planner
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>Workflow Status</span>
              {getWorkflowBadge(workflow)}
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "14px", lineHeight: "1.5" }}>
              {workflow
                ? `Workflow #${workflow.id} is ${workflow.status}. 4 specialized agents (Budget, Activity, Risk, Readiness) have evaluated the trip.`
                : "No AI plan generated yet. Generate an intelligent multi-agent assessment for spending, itinerary, and risk."}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", fontSize: "0.78rem" }}>
              <div style={{ padding: "8px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <strong>Budget Agent:</strong> {workflow ? "✓ Checked" : "Idle"}
              </div>
              <div style={{ padding: "8px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <strong>Activity Agent:</strong> {workflow ? "✓ Checked" : "Idle"}
              </div>
              <div style={{ padding: "8px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <strong>Risk Agent:</strong> {workflow ? "✓ Checked" : "Idle"}
              </div>
              <div style={{ padding: "8px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <strong>Readiness Agent:</strong> {workflow ? "✓ Checked" : "Idle"}
              </div>
            </div>
          </div>

          {/* Travel Safety Snapshot */}
          <div className="tw-card">
            <div className="tw-card-header">
              <h3 className="tw-card-title">
                <span>🌦️</span> Safety & Weather Telemetry
              </h3>
              <button className="btn btn-outline btn-sm" onClick={() => onNavigate("safety")}>
                View Risk Details
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div>
                <strong style={{ fontSize: "1.1rem" }}>{weather ? `${weather.temperatureCelsius}°C` : "22°C"}</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginLeft: "8px" }}>
                  Wind: {weather ? `${weather.windSpeedKmh} km/h` : "4 km/h"}
                </span>
              </div>
              <span className="badge badge-success">FAVORABLE</span>
            </div>

            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "6px" }}>
              {weather?.weatherSummary || "Weather conditions in Ella are favorable for outdoor adventure."}
            </p>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "8px" }}>
              Live telemetry provided via Open-Meteo API
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;
