import { useState } from "react";
import TravelWiseLogo from "./TravelWiseLogo";
import { API_BASE_URL } from "../apiConfig";

export default function ForgotPasswordPage({ onNavigateLogin }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        throw new Error("Unable to process password reset. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
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
      <header style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onNavigateLogin}
          style={{
            background: "none",
            border: "none",
            color: "#64748B",
            cursor: "pointer",
            fontSize: "0.92rem",
            fontWeight: 500,
          }}
        >
          ← Back to sign in
        </button>
        <div style={{ cursor: "pointer" }} onClick={onNavigateLogin}>
          <TravelWiseLogo size={28} />
        </div>
      </header>

      <main style={{ maxWidth: "440px", width: "100%", margin: "20px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(15, 43, 72, 0.08)",
            border: "1px solid #E2E8F0",
            padding: "40px 36px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <TravelWiseLogo size={32} showTagline={false} />
            <h1
              style={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#0F2B48",
                marginTop: "16px",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              Forgot Password
            </h1>
            <p style={{ color: "#64748B", fontSize: "0.92rem", margin: 0, lineHeight: 1.5 }}>
              Enter the email associated with your TravelWise account and we'll send you a link to reset your password.
            </p>
          </div>

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
                textAlign: "left",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {submitted ? (
            <div style={{ padding: "12px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "#F0FDFA",
                  color: "#0D9488",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  margin: "0 auto 16px",
                }}
              >
                ✉️
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2B48", marginBottom: "8px" }}>
                Check your email
              </h3>
              <p style={{ color: "#64748B", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "24px" }}>
                If an account exists for <strong>{email}</strong>, password reset instructions have been sent.
              </p>
              <button
                type="button"
                onClick={onNavigateLogin}
                style={{
                  width: "100%",
                  backgroundColor: "#0F2B48",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: "24px" }}>
                <label
                  htmlFor="forgot-email"
                  style={{
                    display: "block",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: "6px",
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94A3B8",
                    }}
                  >
                    ✉️
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{
                      width: "100%",
                      padding: "11px 14px 11px 40px",
                      borderRadius: "8px",
                      border: "1px solid #CBD5E1",
                      fontSize: "0.95rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

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
                }}
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>

              <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.9rem", color: "#64748B" }}>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={onNavigateLogin}
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
            </form>
          )}
        </div>
      </main>

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
        </svg>
      </footer>
    </div>
  );
}
