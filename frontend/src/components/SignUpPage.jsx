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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        backgroundImage: "radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.04) 0%, transparent 60%)",
        display: "flex",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Left Column: Form */}
      <div
        style={{
          flex: "1 1 540px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "32px 36px",
          maxWidth: "620px",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={onBackToLanding}
            className="auth-link-btn"
            style={{
              color: "#64748B",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            ← Back to home
          </button>
          <div style={{ cursor: "pointer" }} onClick={onBackToLanding}>
            <TravelWiseLogo size={28} />
          </div>
        </header>

        <div style={{ maxWidth: "460px", width: "100%", margin: "20px auto" }} className="auth-card">
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#0F2B48",
              marginBottom: "8px",
              letterSpacing: "-0.02em",
            }}
          >
            Create your account
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.92rem", marginBottom: "20px" }}>
            Join TravelWise and start planning smarter journeys.
          </p>

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
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="signup-fullname" className="auth-label">
                Full Name
              </label>
              <input
                id="signup-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kasun Perera"
                required
                className="auth-input no-icon"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="signup-username" className="auth-label">
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                required
                className="auth-input no-icon"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="signup-email" className="auth-label">
                Email Address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="auth-input no-icon"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="signup-password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="auth-input no-icon has-toggle"
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

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="signup-confirm-password" className="auth-label">
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                className="auth-input no-icon"
              />
            </div>

            {/* Checklist Requirements */}
            <div
              style={{
                marginBottom: "20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
                fontSize: "0.82rem",
                padding: "10px 12px",
                backgroundColor: "#F8FAFC",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              <div style={{ color: hasMinLength ? "#1D4ED8" : "#64748B", fontWeight: hasMinLength ? 600 : 400 }}>
                {hasMinLength ? "✓" : "○"} 8+ characters
              </div>
              <div style={{ color: hasLetter ? "#1D4ED8" : "#64748B", fontWeight: hasLetter ? 600 : 400 }}>
                {hasLetter ? "✓" : "○"} At least 1 letter
              </div>
              <div style={{ color: hasNumber ? "#1D4ED8" : "#64748B", fontWeight: hasNumber ? 600 : 400 }}>
                {hasNumber ? "✓" : "○"} At least 1 number
              </div>
              <div style={{ color: passwordsMatch ? "#1D4ED8" : "#64748B", fontWeight: passwordsMatch ? 600 : 400 }}>
                {passwordsMatch ? "✓" : "○"} Passwords match
              </div>
            </div>

            {/* Sign Up Primary 3D Button */}
            <button
              id="signup-submit-btn"
              type="submit"
              disabled={loading || !isFormValid}
              className="auth-btn-primary"
            >
              {loading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.9rem", color: "#64748B" }}>
            Already have an account?{" "}
            <button
              id="navigate-signin-btn"
              type="button"
              onClick={onNavigateSignIn}
              className="auth-link-btn"
              style={{ fontSize: "0.92rem" }}
            >
              Sign in
            </button>
          </div>
        </div>

        <footer style={{ textAlign: "center", fontSize: "0.8rem", color: "#94A3B8" }}>
          © {new Date().getFullYear()} TravelWise • All rights reserved
        </footer>
      </div>

      {/* Right Column: Travel Visual & Quote */}
      <div
        className="signup-split-visual"
        style={{
          flex: "1 1 500px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px",
          position: "relative",
          backgroundImage: `linear-gradient(to top, rgba(15, 43, 72, 0.94) 0%, rgba(15, 43, 72, 0.55) 45%, rgba(15, 43, 72, 0.25) 100%), url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "#FFFFFF",
        }}
      >
        <div style={{ maxWidth: "440px", position: "relative", zIndex: 2 }}>
          <p
            style={{
              fontSize: "2.1rem",
              fontWeight: 800,
              lineHeight: 1.25,
              fontStyle: "italic",
              marginBottom: "12px",
              color: "#FFFFFF",
              textShadow: "0 3px 12px rgba(0, 0, 0, 0.7)",
            }}
          >
            "Good travellers make better humans."
          </p>
          <p
            style={{
              fontSize: "1rem",
              color: "rgba(255, 255, 255, 0.9)",
              fontWeight: 500,
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.6)",
            }}
          >
            Join thousands of travellers planning smarter journeys with TravelWise.
          </p>
        </div>
      </div>
    </div>
  );
}
