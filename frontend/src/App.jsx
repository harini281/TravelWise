import { useEffect, useState } from "react";
import { API_BASE_URL } from "./apiConfig";
import AuthBar from "./components/AuthBar";
import DashboardOverview from "./components/DashboardOverview";
import ExpenseManager from "./components/ExpenseManager";
import ActivityManager from "./components/ActivityManager";
import RiskDashboard from "./components/RiskDashboard";
import ReadinessDashboard from "./components/ReadinessDashboard";
import WorkflowDashboard from "./components/WorkflowDashboard";

function App() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("travelwise_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      sessionStorage.setItem("travelwise_user", JSON.stringify(userData));
    } catch {
      // quota or private browsing
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem("travelwise_user");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Trips/2`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load trip context.");
        return response.json();
      })
      .then((data) => {
        setTrip(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const isReviewerOrAdmin = user?.role === "Reviewer" || user?.role === "Admin";

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "trip", label: "My Trip", icon: "🗺️" },
    { id: "budget", label: "Budget & Expenses", icon: "💳" },
    { id: "activities", label: "Activities", icon: "🗓️" },
    { id: "safety", label: "Safety & Risk", icon: "🛡️" },
    { id: "readiness", label: "Travel Readiness", icon: "📋" },
    { id: "ai_planner", label: "AI Trip Planner", icon: "🤖" },
  ];

  if (isReviewerOrAdmin) {
    navItems.push({ id: "review", label: "Workflow Review", icon: "⚖️" });
  }

  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard Overview";
      case "trip":
        return "Trip Details & Context";
      case "budget":
        return "Budget & Expenses";
      case "activities":
        return "Experience & Activity Planning";
      case "safety":
        return "Travel Safety & Risk";
      case "readiness":
        return "Travel Readiness Checklist";
      case "ai_planner":
        return "AI Trip Planner";
      case "review":
        return "AI Workflow Review";
      default:
        return "TravelWise";
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="app-sidebar-brand">
          <div className="brand-icon">✈️</div>
          <div>
            <div className="brand-title">TravelWise</div>
            <div className="brand-subtitle">Intelligent Travel Platform</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9rem",
                  }}
                >
                  👤
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    Role: <strong style={{ color: "#ffffff" }}>{user.role}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ width: "100%", color: "#cbd5e1", borderColor: "rgba(255, 255, 255, 0.2)" }}
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.76rem", color: "#94a3b8", marginBottom: "8px" }}>
                Sign in to manage governance and approval
              </p>
              <AuthBar user={user} onLogin={handleLogin} onLogout={handleLogout} />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        {/* Sticky Header */}
        <header className="app-header">
          <div className="header-title-section">
            <button
              type="button"
              className="header-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle navigation"
            >
              ☰
            </button>
            <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)" }}>
              {getPageTitle()}
            </span>
            <span className="header-trip-badge">
              {trip?.startingPlace ?? "Colombo"} ➔ {trip?.destination ?? "Ella"}
            </span>
          </div>

          <div className="header-user-section">
            <AuthBar user={user} onLogin={handleLogin} onLogout={handleLogout} />
          </div>
        </header>

        {/* Dynamic Tab Content Container */}
        <main className="content-container">
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>✈️</div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: "600" }}>Loading TravelWise...</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Connecting to ASP.NET Core gateway and database context...
              </p>
            </div>
          ) : error ? (
            <div className="tw-card" style={{ borderLeft: "4px solid var(--danger)", padding: "24px" }}>
              <h3 style={{ color: "var(--danger)", margin: "0 0 8px" }}>Connection Notice</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
                Unable to load trip information: {error}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => window.location.reload()}
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardOverview trip={trip} onNavigate={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === "trip" && (
                <div className="tw-card">
                  <div className="tw-card-header">
                    <h2 className="tw-card-title">
                      <span>🗺️</span> Journey Details & Parameters
                    </h2>
                    <span className="badge badge-success">{trip?.status}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ padding: "14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)" }}>
                      <span className="text-muted">Origin & Destination</span>
                      <div style={{ fontSize: "1.05rem", fontWeight: "700", marginTop: "4px" }}>
                        {trip?.startingPlace} ➔ {trip?.destination}
                      </div>
                    </div>

                    <div style={{ padding: "14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)" }}>
                      <span className="text-muted">Travel Dates</span>
                      <div style={{ fontSize: "1.05rem", fontWeight: "700", marginTop: "4px" }}>
                        {new Date(trip?.startDate).toLocaleDateString()} – {new Date(trip?.returnDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div style={{ padding: "14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)" }}>
                      <span className="text-muted">Allocated Budget</span>
                      <div style={{ fontSize: "1.05rem", fontWeight: "700", marginTop: "4px" }}>
                        LKR {trip?.budgetAmount?.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ padding: "14px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "var(--radius-md)" }}>
                      <span className="text-muted">Party & Category</span>
                      <div style={{ fontSize: "1.05rem", fontWeight: "700", marginTop: "4px" }}>
                        {trip?.travellerCount} Travellers • {trip?.tripType}
                      </div>
                    </div>
                  </div>

                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6" }}>
                    Trip context is persisted in PostgreSQL and serves as the single source of truth for all budget limits, activity date-boundary validation, and LangGraph multi-agent orchestration.
                  </p>
                </div>
              )}

              {activeTab === "budget" && <ExpenseManager tripId={2} />}

              {activeTab === "activities" && <ActivityManager tripId={2} />}

              {activeTab === "safety" && <RiskDashboard tripId={2} />}

              {activeTab === "readiness" && <ReadinessDashboard tripId={2} />}

              {activeTab === "ai_planner" && (
                <WorkflowDashboard tripId={2} user={user} isReviewMode={false} />
              )}

              {activeTab === "review" && (
                <WorkflowDashboard tripId={2} user={user} isReviewMode={true} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
