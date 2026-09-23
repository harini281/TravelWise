import { apiFetch as fetch } from "../apiClient";
import { useState, useEffect } from "react";
import TravelWiseLogo from "./TravelWiseLogo";
import { API_BASE_URL } from "../apiConfig";

export default function ResetPasswordPage({ onNavigateLogin }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const tokenParam = params.get("token");
    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);
  }, []);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = hasMinLength && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !token.trim()) {
      setError("Password reset link is incomplete or missing reset token.");
      return;
    }

    if (!isValid) {
      setError("Please ensure your new password satisfies all requirements and matches confirmation.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || "Invalid or expired password reset token.");
      }

      setSuccess(true);
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

      <main style={{ maxWidth: "480px", width: "100%", margin: "30px auto", padding: "0 24px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
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
              Security Credentials
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
              Reset Password
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              Create a strong, new password for your TravelWise account.
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>🎉</div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
                Password Updated!
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "24px" }}>
                Your account password has been successfully reset. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={onNavigateLogin}
                style={{
                  width: "100%",
                  padding: "13px",
                  backgroundColor: "var(--teal)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In Now →
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

              <div style={{ marginBottom: "14px" }}>
                <label
                  htmlFor="reset-email"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
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

              <div style={{ marginBottom: "14px" }}>
                <label
                  htmlFor="reset-token"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Reset Token
                </label>
                <input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from email"
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

              <div style={{ marginBottom: "14px" }}>
                <label
                  htmlFor="reset-password"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="reset-confirm"
                  style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}
                >
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
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

              <button
                type="submit"
                disabled={loading || !isValid}
                style={{
                  width: "100%",
                  padding: "13px",
                  backgroundColor: isValid ? "var(--teal)" : "var(--border-color)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.98rem",
                  fontWeight: 700,
                  cursor: isValid && !loading ? "pointer" : "not-allowed",
                  boxShadow: isValid ? "0 4px 16px rgba(37, 99, 235, 0.3)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {loading ? "Updating password..." : "Set New Password →"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
