import { useState } from "react";
import TravelWiseLogo from "./TravelWiseLogo";
import { API_BASE_URL } from "../apiConfig";

export default function SignInPage({ onLoginSuccess, onNavigateSignUp, onNavigateForgotPassword, onBackToLanding }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showQuickFill, setShowQuickFill] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter both email/username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Incorrect email or password.");
        }
        const text = await response.text();
        throw new Error(text || "Unable to sign in. Please try again.");
      }

      const data = await response.json();
      onLoginSuccess({
        username: data.username,
        email: data.email,
        fullName: data.fullName || data.username,
        role: data.role,
        hasCompletedOnboarding: data.hasCompletedOnboarding,
        travelStyle: data.travelStyle,
        interests: data.interests,
        budgetStyle: data.budgetStyle,
        token: data.token,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setIdentifier(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="auth-page-container">
      {/* Top bar with back to home */}
      <header style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onBackToLanding}
          className="auth-link-btn"
          style={{
            color: "#64748B",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.92rem",
            fontWeight: 500,
          }}
        >
          ← Back to home
        </button>
        <div style={{ cursor: "pointer" }} onClick={onBackToLanding}>
          <TravelWiseLogo size={28} />
        </div>
      </header>

      {/* Center Auth Card */}
      <main style={{ width: "100%", maxWidth: "440px", margin: "20px auto", padding: "0 20px" }}>
        <div className="auth-card">
          {/* Logo Brand Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <TravelWiseLogo size={32} showTagline={false} />
            <h1
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0F2B48",
                marginTop: "16px",
                marginBottom: "6px",
                letterSpacing: "-0.02em",
              }}
            >
              Welcome back
            </h1>
            <p style={{ color: "#64748B", fontSize: "0.92rem", margin: 0 }}>
              Sign in to continue your travel planning journey.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FCA5A5",
                color: "#991B1B",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "0.88rem",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label htmlFor="signin-identifier" className="auth-label">
                Email or Username
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">👤</span>
                <input
                  id="signin-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or traveller"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label htmlFor="signin-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">🔒</span>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="auth-input has-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
                fontSize: "0.88rem",
              }}
            >
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "#475569" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "#2563eb", width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontWeight: 500 }}>Remember me</span>
              </label>

              <button
                type="button"
                onClick={onNavigateForgotPassword}
                className="auth-link-btn"
                style={{ fontSize: "0.88rem" }}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              id="signin-submit-btn"
              type="submit"
              disabled={loading}
              className="auth-btn-primary"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Examiner Viva Demo Quick Fill Helper */}
          <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px dashed #E2E8F0" }}>
            <button
              type="button"
              onClick={() => setShowQuickFill(!showQuickFill)}
              style={{
                background: "none",
                border: "none",
                color: "#64748B",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                width: "100%",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <span>🎓 Viva Voce Examiner Demo Accounts</span>
              <span>{showQuickFill ? "▴" : "▾"}</span>
            </button>

            {showQuickFill && (
              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleQuickFill("traveller", "Traveller123!")}
                  className="auth-demo-card"
                  style={{ color: "#1E40AF" }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>Traveller</div>
                  <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 400 }}>Standard</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("reviewer", "Reviewer123!")}
                  className="auth-demo-card"
                  style={{ color: "#0F766E" }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>Reviewer</div>
                  <div style={{ fontSize: "0.68rem", color: "#0F766E", fontWeight: 400 }}>Approval</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "Admin123!")}
                  className="auth-demo-card"
                  style={{ color: "#DC2626" }}
                >
                  <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>Admin</div>
                  <div style={{ fontSize: "0.68rem", color: "#991B1B", fontWeight: 400 }}>Full Access</div>
                </button>
              </div>
            )}
          </div>

          {/* Create Account Link */}
          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.92rem", color: "#64748B" }}>
            Don't have an account?{" "}
            <button
              id="navigate-signup-btn"
              type="button"
              onClick={onNavigateSignUp}
              className="auth-link-btn"
              style={{ fontSize: "0.92rem" }}
            >
              Create account
            </button>
          </div>
        </div>
      </main>

      {/* Subdued Scenic Mountain Graphic Base (matching reference mockup) */}
      <footer style={{ padding: "0 0 16px 0", textAlign: "center" }}>
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "60px", display: "block", opacity: 0.4 }}
        >
          <path
            d="M0 80L120 50L240 65L360 40L480 60L600 30L720 55L840 35L960 50L1080 30L1200 60L1320 45L1440 70V80H0Z"
            fill="#CBD5E1"
          />
          <path
            d="M0 80L160 60L320 70L480 50L640 68L800 45L960 62L1120 48L1280 65L1440 55V80H0Z"
            fill="#94A3B8"
            opacity="0.5"
          />
        </svg>
      </footer>
    </div>
  );
}
