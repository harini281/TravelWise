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

      <main style={{ maxWidth: "460px", width: "100%", margin: "20px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(15, 43, 72, 0.08)",
            border: "1px solid #E2E8F0",
            padding: "40px 36px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
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
              Reset Password
            </h1>
            <p style={{ color: "#64748B", fontSize: "0.92rem", margin: 0 }}>
              Enter a new secure password for your TravelWise account.
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
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  backgroundColor: "#F0FDF4",
                  color: "#16A34A",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  margin: "0 auto 16px",
                }}
              >
                ✓
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2B48", marginBottom: "8px" }}>
                Password Reset Successfully
              </h3>
              <p style={{ color: "#64748B", fontSize: "0.92rem", lineHeight: 1.6, marginBottom: "24px" }}>
                Your password has been updated. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={onNavigateLogin}
                style={{
                  width: "100%",
                  backgroundColor: "#0F2B48",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "13px 20px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In Now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="reset-email"
                  style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
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
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.92rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="reset-token"
                  style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                >
                  Reset Token
                </label>
                <input
                  id="reset-token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste 64-character token from email link"
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #CBD5E1",
                    fontSize: "0.88rem",
                    fontFamily: "monospace",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="reset-new-password"
                  style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                >
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reset-new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
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

              <div style={{ marginBottom: "18px" }}>
                <label
                  htmlFor="reset-confirm-password"
                  style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}
                >
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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

              {/* Requirement Checklist */}
              <div style={{ marginBottom: "22px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.82rem" }}>
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
                disabled={loading || !isValid}
                style={{
                  width: "100%",
                  backgroundColor: isValid ? "#0F2B48" : "#94A3B8",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "13px 20px",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: isValid ? "pointer" : "not-allowed",
                  boxShadow: isValid ? "0 4px 12px rgba(15, 43, 72, 0.25)" : "none",
                }}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer style={{ padding: "0 0 16px 0", textAlign: "center" }}>
        <p style={{ fontSize: "0.8rem", color: "#94A3B8" }}>
          © {new Date().getFullYear()} TravelWise • University Demonstration Edition
        </p>
      </footer>
    </div>
  );
}
