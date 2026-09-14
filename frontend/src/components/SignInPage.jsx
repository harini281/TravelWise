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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Top bar with back to home */}
      <header style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onBackToLanding}
          style={{
            background: "none",
            border: "none",
            color: "#64748B",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.92rem",
            cursor: "pointer",
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
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(15, 43, 72, 0.08)",
            border: "1px solid #E2E8F0",
            padding: "40px 36px",
          }}
        >
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

          {/* Forgot Notice */}
          {forgotNotice && (
            <div
              style={{
                backgroundColor: "#F0FDFA",
                border: "1px solid #99F6E4",
                color: "#0F766E",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "0.85rem",
                marginBottom: "20px",
              }}
            >
              ℹ️ <strong>Password Reset Notice:</strong> Email password recovery tokens will be configured in Stage 2. For now, you can sign in directly using the demo accounts below.
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="signin-identifier"
                style={{
                  display: "block",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Email or Username
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    fontSize: "1rem",
                  }}
                >
                  👤
                </span>
                <input
                  id="signin-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or traveller"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px 11px 40px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0D9488";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(13, 148, 136, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#CBD5E1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="signin-password"
                style={{
                  display: "block",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "#334155",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94A3B8",
                    fontSize: "1rem",
                  }}
                >
                  🔒
                </span>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 42px 11px 40px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.95rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#0D9488";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(13, 148, 136, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#CBD5E1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748B",
                    fontSize: "0.95rem",
                    padding: "4px",
                  }}
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
                  style={{ accentColor: "#0F2B48", width: "16px", height: "16px" }}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={onNavigateForgotPassword}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0D9488",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                backgroundColor: "#0F2B48",
                color: "#FFFFFF",
                border: "none",
                padding: "13px 20px",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 12px rgba(15, 43, 72, 0.25)",
                transition: "background-color 0.15s, transform 0.15s",
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#1E3A8A";
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#0F2B48";
              }}
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
                  style={{
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    borderRadius: "6px",
                    padding: "8px 4px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: 600,
                    color: "#0F2B48",
                  }}
                >
                  Traveller
                  <div style={{ fontSize: "0.68rem", color: "#64748B", fontWeight: 400 }}>Standard</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("reviewer", "Reviewer123!")}
                  style={{
                    backgroundColor: "#F0FDFA",
                    border: "1px solid #99F6E4",
                    borderRadius: "6px",
                    padding: "8px 4px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: 600,
                    color: "#0D9488",
                  }}
                >
                  Reviewer
                  <div style={{ fontSize: "0.68rem", color: "#0F766E", fontWeight: 400 }}>Approval</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("admin", "Admin123!")}
                  style={{
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "6px",
                    padding: "8px 4px",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    textAlign: "center",
                    fontWeight: 600,
                    color: "#DC2626",
                  }}
                >
                  Admin
                  <div style={{ fontSize: "0.68rem", color: "#991B1B", fontWeight: 400 }}>Full Access</div>
                </button>
              </div>
            )}
          </div>

          {/* Create Account Link */}
          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.9rem", color: "#64748B" }}>
            Don't have an account?{" "}
            <button
              id="navigate-signup-btn"
              type="button"
              onClick={onNavigateSignUp}
              style={{
                background: "none",
                border: "none",
                color: "#0D9488",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
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
