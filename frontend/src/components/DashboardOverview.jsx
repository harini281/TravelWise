import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function DashboardOverview({ trip, user, onNavigate }) {
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [weather, setWeather] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      const tripId = trip?.id;
      if (!tripId) {
        setBudgetSummary(null);
        setActivities([]);
        setWeather(null);
        setReadiness(null);
        setWorkflow(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [bRes, aRes, wRes, rRes, wfRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/Budgets/trip/${tripId}/summary`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Activities/trip/${tripId}`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_BASE_URL}/api/Risk/weather/trip/${tripId}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Readiness/trip/${tripId}`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_BASE_URL}/api/Workflow/trip/${tripId}/latest`).then((r) => (r.ok ? r.json() : null)),
        ]);

        if (bRes.status === "fulfilled" && bRes.value) setBudgetSummary(bRes.value);
        if (aRes.status === "fulfilled" && aRes.value) setActivities(Array.isArray(aRes.value) ? aRes.value : []);
        if (wRes.status === "fulfilled" && wRes.value) setWeather(wRes.value);
        if (rRes.status === "fulfilled" && rRes.value) setReadiness(rRes.value);
        if (wfRes.status === "fulfilled" && wfRes.value) setWorkflow(wfRes.value);
      } catch (e) {
        console.error("Dashboard overview load error:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [trip?.id]);

  const totalSpent = budgetSummary?.totalSpent ?? trip?.spentAmount ?? 0;
  const totalBudget = budgetSummary?.totalBudget ?? trip?.budgetAmount ?? 0;
  const remainingBudget = budgetSummary?.remainingFunds ?? (totalBudget - totalSpent);
  const spendPct = budgetSummary?.spendingPercentage ?? (totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0);
  const budgetHealthStatus = budgetSummary?.budgetHealth ?? (totalBudget > 0 ? "HEALTHY" : "UNSET");
  const safeToSpend = budgetSummary?.safeToSpend ?? 0;

  const getHealthBadge = (health) => {
    switch (health) {
      case "HEALTHY":
        return <span className="badge badge-success">HEALTHY</span>;
      case "MODERATE":
        return <span className="badge badge-info">MODERATE</span>;
      case "WARNING":
        return <span className="badge badge-warning">WARNING</span>;
      case "OVERSPENT":
      case "CRITICAL":
        return <span className="badge badge-danger">OVERSPENT</span>;
      default:
        return <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-muted)" }}>UNSET</span>;
    }
  };

  const getWorkflowBadge = (wf) => {
    if (!wf) return <span className="badge badge-info">NOT STARTED</span>;
    if (wf.approvalStatus === "APPROVED" || wf.status === "COMPLETED") return <span className="badge badge-success">APPROVED</span>;
    if (wf.approvalStatus === "CHANGES_REQUESTED" || wf.status === "REVISION_REQUIRED") return <span className="badge badge-warning">CHANGES REQUESTED</span>;
    if (wf.approvalStatus === "REJECTED" || wf.status === "REJECTED") return <span className="badge badge-danger">REJECTED</span>;
    if (wf.status === "AWAITING_APPROVAL") return <span className="badge badge-warning">AWAITING REVIEW</span>;
    return <span className="badge badge-ai">{wf.status}</span>;
  };

  const completedRequirements = readiness?.checklist?.filter((item) => item.status === "COMPLETED")?.length ?? 0;
  const totalRequirements = readiness?.checklist?.length ?? 0;
  const readinessPct = totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 100;

  const destinationsInspiration = [
    {
      name: "Ella",
      label: "Highland Escapes",
      desc: "Nine Arches Bridge, misty tea plantations, and ridge treks.",
      image: "https://images.unsplash.com/photo-1586613834526-6f8b5c7d0ca5?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Sigiriya",
      label: "Ancient Horizons",
      desc: "5th-century rock fortress, water gardens, and wild jungle views.",
      image: "https://images.unsplash.com/photo-1588598198321-9735fd524a25?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Kandy",
      label: "Culture & Living Heritage",
      desc: "Temple of the Tooth, royal botanical gardens, and highland lake breeze.",
      image: "https://images.unsplash.com/photo-1588258524675-cf2a3a3c0e2e?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Galle",
      label: "Coastal Character",
      desc: "Dutch colonial ramparts, oceanfront light, and maritime cobblestone lanes.",
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
    },
    {
      name: "Nuwara Eliya",
      label: "Cooler Days",
      desc: "Lake Gregory, colonial bungalows, and mountain tea factory tours.",
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80",
    },
  ];

  return (
    <div>
      {/* Personalized Welcome & Preferences Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          padding: "4px 0",
        }}
      >
        <div>
          <span
            style={{
              color: "var(--teal)",
              fontSize: "0.76rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Traveller Workspace
          </span>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.1rem",
              fontWeight: 600,
              color: "var(--ink)",
              margin: "4px 0 6px",
              letterSpacing: "-0.02em",
            }}
          >
            Welcome, {user?.fullName || user?.username || "Traveller"} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
            {trip ? `Managing your journey to ${trip.destination}` : "Plan your next mindful journey with precision telemetry."}
          </p>
        </div>

        {/* Saved Preferences Summary Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#ffffff",
            padding: "8px 16px",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🧭</span>
          <div style={{ fontSize: "0.84rem" }}>
            <strong style={{ color: "var(--ink)" }}>{user?.travelStyle || "Adventure"}</strong>
            <span style={{ color: "var(--border-color)", margin: "0 8px" }}>|</span>
            <span style={{ color: "var(--text-secondary)" }}>
              {Array.isArray(user?.interests)
                ? user.interests.slice(0, 2).join(", ")
                : (user?.interests || "Nature, Hiking")}
            </span>
            <span style={{ color: "var(--border-color)", margin: "0 8px" }}>|</span>
            <span style={{ color: "var(--teal)", fontWeight: 600 }}>{user?.budgetStyle || "Balanced"}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            style={{
              background: "none",
              border: "none",
              color: "var(--teal)",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              marginLeft: "4px",
            }}
          >
            Edit
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* SCENARIO A: NO TRIP PLANNED YET (BEAUTIFUL EMPTY STATE)    */}
      {/* ========================================================== */}
      {!trip ? (
        <section>
          {/* Main Hero Card for Empty State */}
          <div
            style={{
              backgroundColor: "var(--bg-navy)",
              color: "#ffffff",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(32px, 5vw, 48px)",
              position: "relative",
              overflow: "hidden",
              marginBottom: "36px",
              boxShadow: "var(--shadow-lg)",
              background: `linear-gradient(135deg, rgba(8, 45, 58, 0.95) 0%, rgba(6, 36, 49, 0.88) 100%), url('https://images.unsplash.com/photo-1586613834526-6f8b5c7d0ca5?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat`,
            }}
          >
            <div style={{ maxWidth: "600px", position: "relative", zIndex: 1 }}>
              <span
                style={{
                  color: "var(--teal-border)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                No Active Journey Scheduled
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "clamp(2.2rem, 4vw, 3.4rem)",
                  fontWeight: 500,
                  color: "#ffffff",
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  margin: "0 0 16px",
                }}
              >
                Where will you go next?
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.85)",
                  fontSize: "1.05rem",
                  lineHeight: 1.6,
                  marginBottom: "28px",
                }}
              >
                You haven&apos;t planned a journey yet. Create your first itinerary to unlock intelligent budgeting, live atmospheric weather risk, protected return reserves, and AI governance.
              </p>

              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => onNavigate("trips")}
                  style={{
                    backgroundColor: "var(--teal)",
                    color: "#ffffff",
                    border: "none",
                    padding: "14px 24px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(22, 169, 157, 0.4)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Plan Your First Trip →
                </button>
                <a
                  href="#destinations-section"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    backdropFilter: "blur(8px)",
                    color: "#ffffff",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    padding: "14px 22px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  Explore Destinations ↓
                </a>
              </div>
            </div>
          </div>

          {/* Curated Destination Inspiration Gallery */}
          <div id="destinations-section" style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
              <div>
                <span style={{ color: "var(--teal)", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Island Inspiration
                </span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--ink)", margin: "4px 0 0" }}>
                  Featured Sri Lankan Destinations
                </h3>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: 0 }}>
                Pick a destination to pre-fill your planning itinerary.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
              {destinationsInspiration.map((dest) => (
                <div
                  key={dest.name}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-color)",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      height: "160px",
                      background: `url('${dest.image}') center/cover no-repeat`,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "12px",
                        backgroundColor: "rgba(9, 43, 58, 0.8)",
                        color: "#ffffff",
                        padding: "4px 10px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {dest.label}
                    </span>
                  </div>

                  <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", color: "var(--ink)", margin: "0 0 6px" }}>
                        {dest.name}
                      </h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5, margin: "0 0 16px" }}>
                        {dest.desc}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigate("trips")}
                      style={{
                        backgroundColor: "var(--bg-surface-alt)",
                        color: "var(--teal)",
                        border: "1px solid var(--border-color)",
                        padding: "10px",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      Plan Trip to {dest.name} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* ========================================================== */
        /* SCENARIO B: REAL TRIP SELECTED                             */
        /* ========================================================== */
        <section>
          {/* Hero Active Journey Card */}
          <div
            style={{
              backgroundColor: "var(--bg-navy)",
              color: "#ffffff",
              borderRadius: "var(--radius-lg)",
              padding: "clamp(24px, 4vw, 32px)",
              position: "relative",
              overflow: "hidden",
              marginBottom: "24px",
              boxShadow: "var(--shadow-md)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--teal-border)", fontWeight: 700 }}>
                    Active Journey
                  </span>
                  <span className="badge" style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" }}>
                    {trip.status}
                  </span>
                  {trip.travelScope && (
                    <span className="badge" style={{ backgroundColor: "rgba(22, 169, 157, 0.25)", color: "#8ae0d5" }}>
                      {trip.travelScope}
                    </span>
                  )}
                </div>

                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
                    margin: "0 0 6px",
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  {trip.destination} {trip.tripType || "Journey"}
                </h2>

                <p style={{ color: "#cbd5e1", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                  <span>{trip.startingPlace}</span>
                  <span style={{ color: "var(--teal-border)" }}>➔</span>
                  <strong style={{ color: "#ffffff" }}>{trip.destination}</strong>
                  {trip.estimatedDistanceKm && (
                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>({trip.estimatedDistanceKm} km)</span>
                  )}
                </p>
              </div>

              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  padding: "14px 20px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.88rem",
                  lineHeight: 1.6,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <div>
                  📅 <strong>
                    {new Date(trip.startDate).toLocaleDateString()} – {new Date(trip.returnDate).toLocaleDateString()}
                  </strong>
                </div>
                <div>👥 <strong>{trip.travellerCount} Traveller{trip.travellerCount > 1 ? "s" : ""}</strong> • {trip.tripType}</div>
                {trip.selectedTransport && <div>🚆 Transport: <strong>{trip.selectedTransport}</strong></div>}
              </div>
            </div>
          </div>

          {/* 4 Summary Metric Cards */}
          <div className="kpi-grid" style={{ marginBottom: "24px" }}>
            {/* 1. Budget Card */}
            <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("budget")}>
              <div className="kpi-label">
                <span>Remaining Budget</span>
                <span>💳</span>
              </div>
              <div className="kpi-value" style={{ color: "var(--ink)" }}>
                LKR {remainingBudget.toLocaleString()}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <span className="kpi-subtext">LKR {totalSpent.toLocaleString()} spent ({spendPct}%)</span>
                {getHealthBadge(budgetHealthStatus)}
              </div>
              {safeToSpend > 0 && (
                <div style={{ fontSize: "0.75rem", color: "var(--teal)", fontWeight: 600, marginTop: "6px" }}>
                  ✓ Safe To Spend: LKR {safeToSpend.toLocaleString()}
                </div>
              )}
            </div>

            {/* 2. Weather Telemetry Card */}
            <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("safety")}>
              <div className="kpi-label">
                <span>Weather & Safety</span>
                <span>🌦️</span>
              </div>
              <div className="kpi-value" style={{ color: "var(--ink)" }}>
                {weather?.temperatureC != null || weather?.temperatureCelsius != null
                  ? `${weather.temperatureC ?? weather.temperatureCelsius}°C`
                  : trip.destination}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <span className="kpi-subtext">
                  {weather?.weatherCondition || weather?.weatherSummary || "Atmospheric telemetry active"}
                </span>
                <span className="badge badge-info">LIVE</span>
              </div>
            </div>

            {/* 3. Travel Readiness Card */}
            <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("readiness")}>
              <div className="kpi-label">
                <span>Travel Readiness</span>
                <span>📋</span>
              </div>
              <div className="kpi-value" style={{ color: "var(--ink)" }}>
                {readinessPct}%
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <span className="kpi-subtext">
                  {totalRequirements > 0
                    ? `${completedRequirements} of ${totalRequirements} checks verified`
                    : "Readiness verified"}
                </span>
                <span className={readinessPct === 100 ? "badge badge-success" : "badge badge-warning"}>
                  {readinessPct === 100 ? "READY" : "IN PROGRESS"}
                </span>
              </div>
            </div>

            {/* 4. AI Workflow Status Card */}
            <div className="kpi-card" style={{ cursor: "pointer" }} onClick={() => onNavigate("workflow")}>
              <div className="kpi-label">
                <span>AI Governance</span>
                <span>🧠</span>
              </div>
              <div className="kpi-value" style={{ fontSize: "1.3rem", color: "var(--ink)" }}>
                {workflow?.approvalStatus || "Awaiting Plan"}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <span className="kpi-subtext">
                  {workflow ? `Reviewer: ${workflow.reviewer || "Assigned"}` : "Multi-agent engine"}
                </span>
                {getWorkflowBadge(workflow)}
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Strip */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "16px 20px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
              Manage components of this journey:
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "8px 14px" }}
                onClick={() => onNavigate("budget")}
              >
                💳 Budget & Expenses
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "8px 14px" }}
                onClick={() => onNavigate("activities")}
              >
                🗓️ Activities ({activities.length})
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "8px 14px" }}
                onClick={() => onNavigate("safety")}
              >
                🌦️ Safety & Weather
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: "0.82rem", padding: "8px 14px" }}
                onClick={() => onNavigate("workflow")}
              >
                🧠 AI Trip Planner
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default DashboardOverview;
