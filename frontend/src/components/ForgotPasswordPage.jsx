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
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--mist)",
        fontFamily: "var(--font-family)",
      }}
    >
      <header style={{ padding: "24px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onNavigateLogin}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: "0.92rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Back to Sign In
        </button>
        <div style={{ cursor: "pointer" }} onClick={onNavigateLogin}>
          <TravelWiseLogo size={30} />
        </div>
      </header>

      <main style={{ maxWidth: "460px", width: "100%", margin: "40px auto", padding: "0 24px" }}>
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            padding: "36px 32px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <span
              style={{
                color: "var(--teal)",
                fontSize: "0.76rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Account Recovery
            </span>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.9rem",
                fontWeight: 600,
                color: "var(--ink)",
                margin: "6px 0 8px",
              }}
            >
              Forgot Password
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Enter your account email to receive a secure, single-use password reset link.
            </p>
          </div>

          {submitted ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>📬</div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                Check Your Inbox
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "24px" }}>
                If an account exists for <strong>{email}</strong>, a reset link with instructions has been dispatched.
              </p>
              <button
                type="button"
                onClick={onNavigateLogin}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    backgroundColor: "var(--danger-bg)",
                    border: "1px solid var(--danger-border)",
                    color: "var(--danger)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 14px",
                    fontSize: "0.88rem",
                    marginBottom: "18px",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="forgot-email"
                  style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}
                >
                  Account Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. traveller@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  backgroundColor: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 16px rgba(22, 169, 157, 0.3)",
                }}
              >
                {loading ? "Sending link..." : "Send Reset Link →"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
