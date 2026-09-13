import { useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function AuthBar({ user, onLogin, onLogout }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid username or password.");
        }
        const text = await response.text();
        throw new Error(text || "Login failed.");
      }

      const data = await response.json();
      onLogin({
        username: data.username,
        email: data.email,
        role: data.role,
        token: data.token,
      });

      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setDemoPersona = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  const getRoleBadgeStyle = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return { backgroundColor: "#dc2626", color: "#fff" };
      case "reviewer":
        return { backgroundColor: "#9333ea", color: "#fff" };
      default:
        return { backgroundColor: "#2563eb", color: "#fff" };
    }
  };

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "20px",
        backgroundColor: "#f9fafb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {user ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>👤 Logged in as: <strong>{user.username}</strong></span>
            <span style={{ fontSize: "0.85em", color: "#6b7280" }}>({user.email})</span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "0.8em",
                fontWeight: "bold",
                ...getRoleBadgeStyle(user.role),
              }}
            >
              {user.role}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "6px 14px",
              backgroundColor: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h4 style={{ margin: 0, fontSize: "1rem" }}>🔐 User Authentication</h4>
            <div style={{ display: "flex", gap: "6px", fontSize: "0.8rem" }}>
              <span style={{ color: "#6b7280", alignSelf: "center" }}>Quick Fill:</span>
              <button
                type="button"
                onClick={() => setDemoPersona("traveller", "Traveller123!")}
                style={{ padding: "3px 8px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Traveller
              </button>
              <button
                type="button"
                onClick={() => setDemoPersona("reviewer", "Reviewer123!")}
                style={{ padding: "3px 8px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Reviewer
              </button>
              <button
                type="button"
                onClick={() => setDemoPersona("admin", "Admin123!")}
                style={{ padding: "3px 8px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                Admin
              </button>
            </div>
          </div>

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}
          >
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "6px 14px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {error && (
            <p style={{ color: "#dc2626", margin: "8px 0 0", fontSize: "0.85rem" }}>
              ⚠️ {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default AuthBar;
