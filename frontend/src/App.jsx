import { useEffect, useState, useRef, useCallback } from "react";
import { API_BASE_URL } from "./apiConfig";
import DestinationExplorer from "./components/DestinationExplorer";
import AccommodationSearch from "./components/accommodation/AccommodationSearch";
import { Icon } from "./components/TravelWiseUI";
import TravelWiseLogo from "./components/TravelWiseLogo";
import LandingPage from "./components/LandingPage";
import SignInPage from "./components/SignInPage";
import SignUpPage from "./components/SignUpPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import OnboardingWizard from "./components/OnboardingWizard";
import ProfilePage from "./components/ProfilePage";
import AuthBar from "./components/AuthBar";
import DashboardOverview from "./components/DashboardOverview";
import ExpenseManager from "./components/ExpenseManager";
import ActivityManager from "./components/ActivityManager";
import RiskDashboard from "./components/RiskDashboard";
import ReadinessDashboard from "./components/ReadinessDashboard";
import WorkflowDashboard from "./components/WorkflowDashboard";
import TripManager from "./components/TripManager";
import AdminDashboard from "./components/AdminDashboard";

function App() {
  const [trip, setTrip] = useState(null);
  const [trips, setTrips] = useState([]);
  const [draftDestination, setDraftDestination] = useState(null);
  const tripsRequest = useRef(null);
  const selectedTripId = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const getInitialTab = () => {
    const path = window.location.pathname.toLowerCase();
    if (path === "/profile") return "profile";
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("travelwise_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const getInitialRoute = () => {
    const path = window.location.pathname.toLowerCase();
    if (path === "/login" || path === "/signin") return "login";
    if (path === "/register" || path === "/signup") return "register";
    if (path === "/forgot-password") return "forgot-password";
    if (path === "/reset-password") return "reset-password";
    if (path === "/onboarding") return "onboarding";
    if (path === "/profile") return "profile";
    if (path === "/dashboard") return "dashboard";
    const saved = sessionStorage.getItem("travelwise_user");
    return saved ? "dashboard" : "landing";
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);

  const navigateTo = (route, search = "") => {
    setCurrentRoute(route);
    if (route === "profile") setActiveTab("profile");
    if (route === "dashboard") setActiveTab("dashboard");
    const pathMap = {
      landing: "/",
      login: "/login",
      register: "/register",
      "forgot-password": "/forgot-password",
      "reset-password": "/reset-password",
      onboarding: "/onboarding",
      dashboard: "/dashboard",
      profile: "/profile",
    };
    const targetPath = (pathMap[route] || "/") + search;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, "", targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setCurrentRoute(route);
      if (route === "profile") setActiveTab("profile");
      if (route === "dashboard") setActiveTab("dashboard");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      sessionStorage.setItem("travelwise_user", JSON.stringify(userData));
    } catch {
      // ignore
    }

    if (userData.role === "Traveller" && !userData.hasCompletedOnboarding) {
      navigateTo("onboarding");
    } else {
      navigateTo("dashboard");
    }
  };

  const handleLogout = () => {
    tripsRequest.current?.abort();
    setTrip(null); setTrips([]); selectedTripId.current = null; setError("");
    setUser(null);
    try {
      sessionStorage.removeItem("travelwise_user");
    } catch {
      // ignore
    }
    navigateTo("login");
  };

  const loadUserTrips = useCallback(async () => {
    tripsRequest.current?.abort();
    if (!user?.token) { setTrip(null); setTrips([]); setLoading(false); return; }
    const controller = new AbortController(); tripsRequest.current = controller;
    try {
      setLoading(true); setError("");
      const response = await fetch(`${API_BASE_URL}/api/Trips`, { signal: controller.signal, headers: { Authorization: `Bearer ${user.token}` } });
      if (!response.ok) throw new Error("Your trips could not be loaded. Please try again.");
      const data = await response.json();
      if (controller.signal.aborted) return;
      const list = Array.isArray(data) ? data : [];
      setTrips(list);
      const selected = list.find(t => t.id === selectedTripId.current) || list.find(t => !["COMPLETED", "CANCELLED"].includes(t.status)) || list[0] || null;
      setTrip(selected); selectedTripId.current = selected?.id;
    } catch (err) {
      if (err.name !== "AbortError") { setError(err.message); setTrip(null); setTrips([]); }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [user?.token]);
  useEffect(() => {
    selectedTripId.current = null;
    setTrip(null); setTrips([]);
    loadUserTrips();
    return () => tripsRequest.current?.abort();
  }, [loadUserTrips]);

  // Fetch updated user profile on mount if token exists
  useEffect(() => {
    if (user?.token) {
      const controller = new AbortController();
      fetch(`${API_BASE_URL}/api/Auth/profile`, {
        headers: { Authorization: `Bearer ${user.token}` }, signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((profile) => {
          if (profile && !controller.signal.aborted) {
            setUser((prev) => {
              const updated = { ...prev, ...profile };
              try {
                sessionStorage.setItem("travelwise_user", JSON.stringify(updated));
              } catch {
                // ignore
              }
              return updated;
            });
          }
        })
        .catch(() => {});
      return () => controller.abort();
    }
  }, [user?.token]);

  const isAdmin = user?.role === "Admin";
  const isReviewerOrAdmin = user?.role === "Reviewer" || user?.role === "Admin";

  const navItems = [
    { id: "dashboard", label: isAdmin ? "Admin workspace" : "Your journey", icon: "dashboard" },
    { id: "explore", label: "Explore destinations", icon: "compass" },
    { id: "accommodation", label: "Accommodation", icon: "compass" },
    { id: "trip", label: "Trip Planning & Map", icon: "compass" },
    { id: "budget", label: "Budget & Expenses", icon: "budget" },
    { id: "activities", label: "Activities", icon: "activities" },
    { id: "safety", label: "Safety & Risk", icon: "safety" },
    { id: "readiness", label: "Travel Readiness", icon: "activities" },
    { id: "ai_planner", label: "AI Trip Planner", icon: "compass" },
    { id: "profile", label: "Profile & Preferences", icon: "profile" },
  ];

  if (isReviewerOrAdmin) {
    navItems.push({ id: "review", label: "Workflow Review", icon: "safety" });
  }


  const getPageTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return isAdmin ? "Admin workspace" : "Your journey";
      case "explore":
        return "Explore destinations";
      case "accommodation":
        return "Accommodation";
      case "trip":
        return "Trip Planning & GIS Route";
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
      case "profile":
        return "Profile & Preferences";
      case "review":
        return "AI Workflow Review";
      case "admin":
        return "Admin & Governance Workspace";
      default:
        return "TravelWise";
    }
  };

  // ROUTE: Landing Page
  if (currentRoute === "landing") {
    return (
      <LandingPage
        onGetStarted={() => { if (user) { navigateTo("dashboard"); setActiveTab("trip"); } else navigateTo("register"); }}
        onPlanDestination={place => { setDraftDestination(place); if (user) { navigateTo("dashboard"); setActiveTab("trip"); } else navigateTo("register"); }}
        onSignIn={() => navigateTo("login")}
        onExploreApp={() => {
          if (user) {
            navigateTo("dashboard");
          } else {
            navigateTo("login");
          }
        }}
      />
    );
  }

  // ROUTE: Sign In / Login Page
  if (currentRoute === "login") {
    return (
      <SignInPage
        onLoginSuccess={handleLogin}
        onNavigateSignUp={() => navigateTo("register")}
        onNavigateForgotPassword={() => navigateTo("forgot-password")}
        onBackToLanding={() => navigateTo("landing")}
      />
    );
  }

  // ROUTE: Registration Page
  if (currentRoute === "register") {
    return (
      <SignUpPage
        onRegisterSuccess={handleLogin}
        onNavigateSignIn={() => navigateTo("login")}
        onBackToLanding={() => navigateTo("landing")}
      />
    );
  }

  // ROUTE: Forgot Password Page
  if (currentRoute === "forgot-password") {
    return (
      <ForgotPasswordPage
        onNavigateLogin={() => navigateTo("login")}
      />
    );
  }

  // ROUTE: Reset Password Page
  if (currentRoute === "reset-password") {
    return (
      <ResetPasswordPage
        onNavigateLogin={() => navigateTo("login")}
      />
    );
  }

  // ROUTE: First-Time Traveller Onboarding
  if (currentRoute === "onboarding") {
    if (!user) {
      navigateTo("login");
      return null;
    }
    return (
      <OnboardingWizard
        user={user}
        onComplete={(updatedUser) => {
          setUser(updatedUser);
          try {
            sessionStorage.setItem("travelwise_user", JSON.stringify(updatedUser));
          } catch {
            // ignore
          }
          navigateTo("dashboard");
        }}
        onSkip={() => navigateTo("dashboard")}
      />
    );
  }

  // PROTECTED ROUTE CHECK for dashboard and internal tabs
  if (!user) {
    navigateTo("login");
    return null;
  }

  return (
    <div className="app-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div
          className="app-sidebar-brand"
          style={{ cursor: "pointer" }}
          onClick={() => navigateTo("landing")}
          title="Return to landing page"
        >
          <TravelWiseLogo size={28} light={true} showTagline={true} />
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
              <span className="nav-item-icon"><Icon name={item.icon}/></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: "#ffffff",
                }}
              >
                {(user?.fullName || user?.username || "U").charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.fullName || user?.username}
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                  Role: <strong style={{ color: "#ffffff" }}>{user?.role}</strong>
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
            {trips.length > 0 && <select className="tw-trip-select" aria-label="Selected trip" value={trip?.id || ""} onChange={e => { const selected = trips.find(t => t.id === Number(e.target.value)); setTrip(selected); selectedTripId.current = selected?.id; }}>
              {trips.map(t => <option key={t.id} value={t.id}>{t.startingPlace} → {t.destination} · {t.startDate?.slice(0,10)}</option>)}
            </select>}
          </div>

          <div className="header-user-section" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => navigateTo("landing")}
              title="Return to public landing page"
              style={{ fontSize: "0.82rem" }}
            >
              🏠 Public Site
            </button>
            <AuthBar
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onOpenSignIn={() => navigateTo("login")}
            />
          </div>
        </header>

        {/* Dynamic Tab Content Container */}
        <main className="content-container">
          {activeTab === "profile" ? (
            <ProfilePage
              user={user}
              onUpdateUser={(updated) => {
                setUser(updated);
                try {
                  sessionStorage.setItem("travelwise_user", JSON.stringify(updated));
                } catch {
                  // ignore
                }
              }}
            />
          ) : (activeTab === "admin" || (isAdmin && activeTab === "dashboard")) && isAdmin ? <AdminDashboard user={user}/> : activeTab === "explore" ? <DestinationExplorer onPlan={place => { setDraftDestination(place); setActiveTab("trip"); }}/> : activeTab === "accommodation" ? <AccommodationSearch /> : loading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>✈️</div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: "600" }}>Loading TravelWise...</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Bringing your saved journeys together…
              </p>
            </div>
          ) : error ? (
            <div className="tw-card" style={{ borderLeft: "4px solid var(--danger)", padding: "24px" }}>
              <h3 style={{ color: "var(--danger)", margin: "0 0 8px" }}>Connection Notice</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
                Unable to load trip information: {error}
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => window.location.reload()}
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <DashboardOverview
                  trip={trip}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "trip" && (
                <TripManager
                  user={user}
                  currentTrip={trip}
                  draftDestination={draftDestination}
                  onConsumeDestination={() => setDraftDestination(null)}
                  onSelectTrip={(selected) => { setTrip(selected); selectedTripId.current = selected?.id; }}
                  onRefreshTrips={loadUserTrips}
                />
              )}

              {activeTab === "budget" && (
                <ExpenseManager
                  key={trip?.id || "empty"}
                  tripId={trip?.id}
                  trip={trip}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "activities" && (
                <ActivityManager
                  key={trip?.id || "empty"}
                  tripId={trip?.id}
                  trip={trip}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "safety" && (
                <RiskDashboard
                  key={trip?.id || "empty"}
                  tripId={trip?.id}
                  trip={trip}
                  destination={trip?.destination}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "readiness" && (
                <ReadinessDashboard
                  key={trip?.id || "empty"}
                  tripId={trip?.id}
                  trip={trip}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "ai_planner" && (
                <WorkflowDashboard
                  key={trip?.id || "empty"}
                  tripId={trip?.id}
                  trip={trip}
                  user={user}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === "profile" && (
                <ProfilePage
                  user={user}
                  onUpdateUser={(updated) => {
                    setUser(updated);
                    try {
                      sessionStorage.setItem("travelwise_user", JSON.stringify(updated));
                    } catch {
                      // ignore
                    }
                  }}
                />
              )}

              {activeTab === "review" && isReviewerOrAdmin && (
                <div className="tw-card">
                  <div className="tw-card-header">
                    <h3 className="tw-card-title">
                      <span>⚖️</span> Reviewer & Auditor Workspace
                    </h3>
                    <span className="badge badge-ai">Role: {user.role}</span>
                  </div>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "16px", lineHeight: "1.6" }}>
                    As an authorized <strong>{user.role}</strong>, you have access to Human-in-the-Loop decision controls over AI-generated plans.
                  </p>
                  <WorkflowDashboard
                  key={trip?.id || "empty"}
                    tripId={trip?.id}
                    trip={trip}
                    user={user}
                    onNavigate={(tab) => setActiveTab(tab)}
                    isReviewMode={true}
                  />
                </div>
              )}

              {activeTab === "admin" && isAdmin && (
                <AdminDashboard user={user} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
