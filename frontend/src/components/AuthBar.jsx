import { useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function AuthBar({ user, onLogin, onLogout, onOpenSignIn }) {
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQuickFill, setShowQuickFill] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid credentials. Please check username and password.");
        }
        const text = await response.text();
        throw new Error(text || "Unable to sign in. Please try again.");
      }

      const data = await response.json();
      onLogin({
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      });

      setPassword("");
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillPersona = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  const getRoleBadgeClass = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "badge badge-danger";
      case "reviewer":
        return "badge badge-ai";
      default:
        return "badge badge-info";
    }
  };

  return (
    <>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontWeight: "600", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                {user.username}
              </span>
              <span className={getRoleBadgeClass(user.role)}>
                {user.role}
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {user.email}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onLogout}
            title="Sign out of account"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (onOpenSignIn) {
              onOpenSignIn();
            } else {
              setShowModal(true);
            }
          }}
        >
          🔐 Sign In
        </button>
      )}

      {/* Modern Login Modal */}
      {showModal && !user && (
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
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
              width: "100%",
              maxWidth: "420px",
              padding: "32px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
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
              title="Close modal"
            >
              ✕
            </button>

            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  backgroundColor: "var(--primary-light)",
                  color: "var(--primary)",
                  borderRadius: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  margin: "0 auto 12px",
                }}
              >
                ✈️
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 4px" }}>
                TravelWise
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                Plan smarter. Travel safer.
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  color: "var(--danger)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-username">
                  Email / Username
                </label>
                <input
                  id="login-username"
                  className="form-input"
                  type="text"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="form-input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", padding: "11px", marginTop: "8px" }}
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </form>

            {/* Subtle Viva Demo Accordion */}
            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px dashed var(--border-color)" }}>
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--secondary)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "4px 0",
                  fontWeight: "500",
                }}
              >
                <span>💡 Examiner Demo Quick-Fill</span>
                <span>{showQuickFill ? "▲" : "▼"}</span>
              </button>

              {showQuickFill && (
                <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fillPersona("traveller", "Traveller123!")}
                  >
                    Traveller
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fillPersona("reviewer", "Reviewer123!")}
                  >
                    Reviewer
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => fillPersona("admin", "Admin123!")}
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuthBar;
