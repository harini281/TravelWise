import { apiFetch as fetch } from "../apiClient";
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


  return (
    <div className="tw-auth-layout"
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "var(--mist)",
        fontFamily: "var(--font-family)",
      }}
    >
      {/* Left side: Premium Sri Lanka Travel Visual (Desktop) */}
      <div
        style={{
          flex: "1 1 50%",
          position: "relative",
          background: `linear-gradient(180deg, rgba(20, 43, 58, 0.78) 0%, rgba(15, 23, 42, 0.94) 100%), url('https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(32px, 5vw, 64px)",
          color: "#ffffff",
        }}
        className="auth-hero-pane"
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ cursor: "pointer" }} onClick={onBackToLanding}>
            <TravelWiseLogo size={32} light showTagline />
          </div>
          <button
            type="button"
            onClick={onBackToLanding}
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            ← Back to Home
          </button>
        </div>

        <div style={{ maxWidth: "480px", marginBlock: "auto" }}>
          <p
            style={{
              color: "#93c5fd",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: "14px",
            }}
          >
            Travel with intention
          </p>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2.4rem, 4vw, 3.6rem)",
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              margin: "0 0 20px",
            }}
          >
            Go further.<br />
            <em style={{ color: "#93c5fd", fontStyle: "italic" }}>Feel closer.</em>
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              marginBottom: "32px",
            }}
          >
            Intelligent itinerary planning, real-time weather telemetry, protected return reserves, and human governance.
          </p>

          <div
            style={{
              display: "flex",
              gap: "24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.2)",
              paddingTop: "24px",
            }}
          >
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block", color: "#ffffff" }}>100%</strong>
              <small style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem" }}>Deterministic Budget</small>
            </div>
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block", color: "#ffffff" }}>Open-Meteo</strong>
              <small style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem" }}>Live Atmospheric Telemetry</small>
            </div>
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block", color: "#ffffff" }}>Human-in-Loop</strong>
              <small style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.75rem" }}>Reviewer Accountability</small>
            </div>
          </div>
        </div>

        <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem" }}>
          © TravelWise Intelligent Journey Planner • Sri Lanka
        </div>
      </div>

      {/* Right side: Clean, High-Contrast Auth Card Form */}
      <div
        style={{
          flex: "1 1 50%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "clamp(24px, 5vw, 64px)",
          backgroundColor: "var(--mist)",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "var(--bg-surface)",
            padding: "clamp(28px, 4vw, 44px)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "28px" }}>
            <span
              style={{
                color: "var(--teal)",
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Secure Account Access
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "2rem",
                fontWeight: 600,
                color: "var(--ink)",
                margin: "6px 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              Sign In
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
              Enter your credentials to continue your planned journeys.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: "var(--danger-bg)",
                border: "1px solid var(--danger-border)",
                color: "var(--danger)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: "0.88rem",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label
                htmlFor="signin-identifier"
                style={{
                  display: "block",
                  fontSize: "0.86rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: "6px",
                }}
              >
                Email or Username
              </label>
              <input
                id="signin-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="traveller or you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  backgroundColor: "var(--bg-surface)",
                  fontSize: "0.95rem",
                  color: "var(--text-primary)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
              />
            </div>

            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label
                  htmlFor="signin-password"
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={onNavigateForgotPassword}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--teal)",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-surface)",
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                    outline: "none",
                    boxSizing: "border-box",
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
                    color: "var(--text-muted)",
                    fontSize: "1rem",
                    padding: 0,
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.86rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "var(--teal)" }}
                />
                Remember me on this browser
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: "var(--teal)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Signing in..." : "Sign In to TravelWise →"}
            </button>
          </form>

          {/* Create Account Link */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Don&apos;t have an account yet?{" "}
            </span>
            <button
              type="button"
              onClick={onNavigateSignUp}
              style={{
                background: "none",
                border: "none",
                color: "var(--teal)",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
