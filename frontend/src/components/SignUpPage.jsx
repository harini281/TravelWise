import { apiFetch as fetch } from "../apiClient";
import { useState } from "react";
import TravelWiseLogo from "./TravelWiseLogo";
import { API_BASE_URL } from "../apiConfig";

export default function SignUpPage({ onRegisterSuccess, onNavigateSignIn, onBackToLanding }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validation requirements
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = fullName.trim() && username.trim().length >= 3 && email.trim() && hasMinLength && hasNumber && hasLetter && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (!isFormValid) {
      setError("Please ensure your password meets all requirements and matches the confirmation field.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          confirmPassword: confirmPassword.trim(),
          role: "Traveller",
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || "Registration failed. Username or email may already be registered.");
      }

      const data = await response.json();
      onRegisterSuccess({
        username: data.username,
        email: data.email,
        fullName: data.fullName || fullName.trim(),
        role: data.role,
        hasCompletedOnboarding: false,
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
      {/* Left Visual Pane */}
      <div
        style={{
          flex: "1 1 45%",
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
            Start your journey
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
            Journeys worth taking<br />
            <em style={{ color: "#93c5fd", fontStyle: "italic" }}>their time over.</em>
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.85)",
              fontSize: "1.05rem",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            Join as a Traveller to experience personalized trip planning, weather risk analysis, and smart budgeting.
          </p>
        </div>

        <div style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.75rem" }}>
          © TravelWise Intelligent Journey Planner • Sri Lanka
        </div>
      </div>

      {/* Right Form Card */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "clamp(24px, 4vw, 48px)",
          backgroundColor: "var(--mist)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "500px",
            backgroundColor: "var(--bg-surface)",
            padding: "clamp(28px, 4vw, 40px)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-lg)",
            margin: "auto 0",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                color: "#2563eb",
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              New Traveller Membership
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "2rem",
                fontWeight: 600,
                color: "var(--ink)",
                margin: "4px 0 6px",
                letterSpacing: "-0.02em",
              }}
            >
              Create Account
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              All new members are automatically enrolled with verified Traveller role privileges.
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label
                  htmlFor="signup-fullname"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Full Name
                </label>
                <input
                  id="signup-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.92rem",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="signup-username"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder="e.g. kasunp"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.92rem",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                htmlFor="signup-email"
                style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
              >
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.92rem",
                  color: "var(--text-primary)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label
                  htmlFor="signup-password"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 36px 11px 12px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.92rem",
                      color: "var(--text-primary)",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-confirm"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Confirm Password
                </label>
                <input
                  id="signup-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${confirmPassword ? (passwordsMatch ? "var(--success)" : "var(--danger)") : "var(--border-color)"}`,
                    fontSize: "0.92rem",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Password strength checklist */}
            <div
              style={{
                backgroundColor: "var(--bg-surface-alt)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.78rem",
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
              }}
            >
              <span style={{ color: hasMinLength ? "var(--success)" : "var(--text-muted)" }}>
                {hasMinLength ? "✓" : "○"} At least 8 characters
              </span>
              <span style={{ color: hasLetter ? "var(--success)" : "var(--text-muted)" }}>
                {hasLetter ? "✓" : "○"} Contains letters
              </span>
              <span style={{ color: hasNumber ? "var(--success)" : "var(--text-muted)" }}>
                {hasNumber ? "✓" : "○"} Contains numbers
              </span>
              <span style={{ color: passwordsMatch ? "var(--success)" : "var(--text-muted)" }}>
                {passwordsMatch ? "✓" : "○"} Passwords match
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: "100%",
                padding: "14px",
                backgroundColor: isFormValid ? "#2563eb" : "var(--border-color)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: isFormValid && !loading ? "pointer" : "not-allowed",
                boxShadow: isFormValid ? "0 4px 16px rgba(37, 99, 235, 0.35)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {loading ? "Creating Account..." : "Create Account & Get Started →"}
            </button>
          </form>

          {/* Sign In Link */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              Already have an account?{" "}
            </span>
            <button
              type="button"
              onClick={onNavigateSignIn}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
