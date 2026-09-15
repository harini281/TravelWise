import { useState } from "react";
import { API_BASE_URL } from "../apiConfig";

export default function ProfilePage({ user, onUpdateUser }) {
  const [travelStyle, setTravelStyle] = useState(user?.travelStyle || "Adventure");
  const [interests, setInterests] = useState(
    Array.isArray(user?.interests) ? user.interests : ["Nature", "Hiking", "Photography"]
  );
  const [budgetStyle, setBudgetStyle] = useState(user?.budgetStyle || "Balanced");
  const [activityPace, setActivityPace] = useState(user?.activityPace || "Balanced");
  const [transport, setTransport] = useState(user?.transportPreference || "Train");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const allInterests = [
    "Nature", "Hiking", "Photography", "Beaches", "Wildlife",
    "Historical Places", "Museums", "Food", "Shopping", "Nightlife",
    "Local Experiences", "Adventure Sports"
  ];

  const toggleInterest = (item) => {
    if (!isEditing) return;
    if (interests.includes(item)) {
      if (interests.length > 1) {
        setInterests(interests.filter((i) => i !== item));
      }
    } else {
      setInterests([...interests, item]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/api/Auth/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          travelStyle,
          interests,
          budgetStyle,
          activityPace,
          transportPreference: transport,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile preferences.");
      }

      const updated = await response.json();
      onUpdateUser({
        ...user,
        ...updated,
      });

      setIsEditing(false);
      setMessage("Preferences updated successfully in PostgreSQL database!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "16px 0" }}>
      {/* Profile Overview Header Card */}
      <div
        className="tw-card"
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
          padding: "32px",
          background: "linear-gradient(135deg, #ffffff 0%, #f2f8f6 100%)",
          border: "1px solid #d1e5e0",
          boxShadow: "0 10px 25px -5px rgba(9, 43, 58, 0.05)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #092b3a 0%, #16a99d 100%)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.2rem",
            fontFamily: "var(--font-serif, 'Playfair Display', Georgia, serif)",
            fontWeight: 700,
            boxShadow: "0 8px 16px rgba(22, 169, 157, 0.25)",
          }}
        >
          {(user?.fullName || user?.username || "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: "240px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h2
              style={{
                fontFamily: "var(--font-serif, 'Playfair Display', Georgia, serif)",
                fontSize: "1.8rem",
                fontWeight: 700,
                color: "var(--ink, #092b3a)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {user?.fullName || user?.username}
            </h2>
            <span
              style={{
                background: "#092b3a",
                color: "#f2f8f6",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {user?.role || "Traveller"}
            </span>
            {user?.hasCompletedOnboarding && (
              <span
                style={{
                  background: "#e6f7f5",
                  color: "#0d7b72",
                  border: "1px solid #b2dfdb",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                ✓ Preferences Active
              </span>
            )}
          </div>
          <p style={{ color: "#546e7a", fontSize: "0.95rem", margin: "6px 0 0" }}>
            Account: <strong style={{ color: "#092b3a" }}>@{user?.username}</strong> &bull; Email:{" "}
            <strong style={{ color: "#092b3a" }}>{user?.email}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={isEditing ? "btn btn-outline" : "btn btn-primary"}
          style={{ padding: "10px 20px", borderRadius: "8px", fontWeight: 600 }}
        >
          {isEditing ? "Cancel Editing" : "Edit Preferences"}
        </button>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #86efac",
            color: "#166534",
            padding: "14px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "0.92rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>✓</span> {message}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "14px 20px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "0.92rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Preferences Section */}
      <div className="tw-card" style={{ padding: "32px", border: "1px solid #e2e8f0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "16px",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "var(--font-serif, 'Playfair Display', Georgia, serif)",
                fontSize: "1.4rem",
                fontWeight: 700,
                color: "var(--ink, #092b3a)",
                margin: 0,
              }}
            >
              Travel & Planning Intelligence
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.9rem", margin: "4px 0 0" }}>
              Tailors your AI itineraries, activity suggestions, and budget guardrails.
            </p>
          </div>
          {isEditing && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="btn btn-primary"
              style={{ padding: "8px 18px", borderRadius: "8px" }}
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: isEditing ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                marginBottom: "8px",
              }}
            >
              Travel Style
            </label>
            {isEditing ? (
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  color: "#092b3a",
                  fontWeight: 500,
                }}
              >
                <option value="Adventure">Adventure</option>
                <option value="Culture & History">Culture & History</option>
                <option value="Relaxation">Relaxation</option>
                <option value="Food & Culinary">Food & Culinary</option>
                <option value="Family">Family</option>
                <option value="Business">Business</option>
              </select>
            ) : (
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink, #092b3a)" }}>
                {travelStyle}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: isEditing ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                marginBottom: "8px",
              }}
            >
              Budget Profile
            </label>
            {isEditing ? (
              <select
                value={budgetStyle}
                onChange={(e) => setBudgetStyle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  color: "#092b3a",
                  fontWeight: 500,
                }}
              >
                <option value="Budget Friendly">Budget Friendly</option>
                <option value="Balanced">Balanced</option>
                <option value="Comfort">Comfort</option>
                <option value="Premium">Premium</option>
              </select>
            ) : (
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink, #092b3a)" }}>
                {budgetStyle}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: isEditing ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                marginBottom: "8px",
              }}
            >
              Pace & Schedule
            </label>
            {isEditing ? (
              <select
                value={activityPace}
                onChange={(e) => setActivityPace(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  color: "#092b3a",
                  fontWeight: 500,
                }}
              >
                <option value="Relaxed">Relaxed (1-2 / day)</option>
                <option value="Balanced">Balanced (3-4 / day)</option>
                <option value="Packed">Packed (Full schedule)</option>
              </select>
            ) : (
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink, #092b3a)" }}>
                {activityPace}
              </div>
            )}
          </div>

          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              backgroundColor: isEditing ? "#ffffff" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#64748B",
                marginBottom: "8px",
              }}
            >
              Transit Preference
            </label>
            {isEditing ? (
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  color: "#092b3a",
                  fontWeight: 500,
                }}
              >
                <option value="Car">Car / Private Taxi</option>
                <option value="Train">Scenic Train</option>
                <option value="Public Transport">Bus / Public</option>
                <option value="Walking">Walking / Trekking</option>
              </select>
            ) : (
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink, #092b3a)" }}>
                {transport}
              </div>
            )}
          </div>
        </div>

        {/* Interests Badges */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "var(--ink, #092b3a)",
              marginBottom: "12px",
            }}
          >
            Active Travel Interests {isEditing && "(Tap to toggle for personalized recommendations)"}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {(isEditing ? allInterests : interests).map((item) => {
              const selected = interests.includes(item);
              return (
                <div
                  key={item}
                  onClick={() => toggleInterest(item)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "24px",
                    border: selected ? "1.5px solid var(--teal, #16a99d)" : "1px solid #cbd5e1",
                    backgroundColor: selected ? "#e6f7f5" : "#f8fafc",
                    color: selected ? "var(--teal-dark, #0d7b72)" : "#475569",
                    fontSize: "0.9rem",
                    fontWeight: selected ? 600 : 500,
                    cursor: isEditing ? "pointer" : "default",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {selected && (
                    <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>✓</span>
                  )}
                  {item}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
