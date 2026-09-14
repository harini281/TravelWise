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
        backgroundColor: "#FFFFFF",
        display: "flex",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Left Column: Form */}
      <div
        style={{
          flex: "1 1 500px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "32px 40px",
          maxWidth: "600px",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            ← Back to home
          </button>
          <div style={{ cursor: "pointer" }} onClick={onBackToLanding}>
            <TravelWiseLogo size={28} />
          </div>
        </header>

        <div style={{ maxWidth: "420px", width: "100%", margin: "24px auto" }}>
          <h1
            style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              color: "#0F2B48",
              marginBottom: "8px",
              letterSpacing: "-0.02em",
            }}
          >
            Create your account
          </h1>
          <p style={{ color: "#64748B", fontSize: "0.95rem", marginBottom: "24px" }}>
            Join TravelWise and start planning smarter.
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
              <label
                htmlFor="signup-fullname"
                style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}
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
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                htmlFor="signup-username"
                style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}
              >
                Username
              </label>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                htmlFor="signup-email"
                style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}
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
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label
                htmlFor="signup-password"
                style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.92rem",
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
                    color: "#64748B",
                  }}
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="signup-confirm-password"
                style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "0.92rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Checklist Requirements */}
            <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.82rem" }}>
              <div style={{ color: hasMinLength ? "#0D9488" : "#94A3B8" }}>
                {hasMinLength ? "✓" : "○"} At least 8 characters
              </div>
              <div style={{ color: hasLetter ? "#0D9488" : "#94A3B8" }}>
                {hasLetter ? "✓" : "○"} At least one letter
              </div>
              <div style={{ color: hasNumber ? "#0D9488" : "#94A3B8" }}>
                {hasNumber ? "✓" : "○"} At least one number
              </div>
              <div style={{ color: passwordsMatch ? "#0D9488" : "#94A3B8" }}>
                {passwordsMatch ? "✓" : "○"} Passwords match
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid}
              style={{
                width: "100%",
                backgroundColor: isFormValid ? "#0F2B48" : "#94A3B8",
                color: "#FFFFFF",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: isFormValid ? "pointer" : "not-allowed",
                boxShadow: isFormValid ? "0 4px 12px rgba(15, 43, 72, 0.25)" : "none",
              }}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "0.88rem", color: "#64748B" }}>
            Already have an account?{" "}
            <button
              id="navigate-signin-btn"
              type="button"
              onClick={onNavigateSignIn}
              style={{
                background: "none",
                border: "none",
                color: "#0D9488",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
              }}
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
