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
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px 0" }}>
      {/* Profile Overview Card */}
      <div
        className="tw-card"
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          flexWrap: "wrap",
          padding: "28px",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "#0F2B48",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            fontWeight: 800,
          }}
        >
          {(user?.fullName || user?.username || "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0F2B48", margin: 0 }}>
              {user?.fullName || user?.username}
            </h2>
            <span className="badge badge-info">{user?.role || "Traveller"}</span>
            {user?.hasCompletedOnboarding && (
              <span className="badge badge-success">✓ Preferences Configured</span>
            )}
          </div>
          <p style={{ color: "#64748B", fontSize: "0.92rem", margin: "4px 0 0" }}>
            Username: <strong>@{user?.username}</strong> • Email: <strong>{user?.email}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={isEditing ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
        >
          {isEditing ? "Cancel Editing" : "Edit Preferences"}
        </button>
      </div>

      {message && (
        <div
          style={{
            backgroundColor: "#F0FDF4",
            border: "1px solid #BBF7D0",
            color: "#16A34A",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ✓ {message}
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Preferences Section */}
      <div className="tw-card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2B48", margin: 0 }}>
              Travel & Planning Preferences
            </h3>
            <p style={{ color: "#64748B", fontSize: "0.88rem", margin: "4px 0 0" }}>
              These settings tailor destination recommendations, activity density, and budget alerts.
            </p>
          </div>
          {isEditing && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="btn btn-primary btn-sm"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Travel Style
            </label>
            {isEditing ? (
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              >
                <option value="Adventure">Adventure</option>
                <option value="Culture & History">Culture & History</option>
                <option value="Relaxation">Relaxation</option>
                <option value="Food & Culinary">Food & Culinary</option>
                <option value="Family">Family</option>
                <option value="Business">Business</option>
              </select>
            ) : (
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0F2B48" }}>{travelStyle}</div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Budget Style
            </label>
            {isEditing ? (
              <select
                value={budgetStyle}
                onChange={(e) => setBudgetStyle(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              >
                <option value="Budget Friendly">Budget Friendly</option>
                <option value="Balanced">Balanced</option>
                <option value="Comfort">Comfort</option>
                <option value="Premium">Premium</option>
              </select>
            ) : (
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0F2B48" }}>{budgetStyle}</div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Activity Pace
            </label>
            {isEditing ? (
              <select
                value={activityPace}
                onChange={(e) => setActivityPace(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              >
                <option value="Relaxed">Relaxed (1-2 / day)</option>
                <option value="Balanced">Balanced (3-4 / day)</option>
                <option value="Packed">Packed (Full schedule)</option>
              </select>
            ) : (
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0F2B48" }}>{activityPace}</div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
              Preferred Transport
            </label>
            {isEditing ? (
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #CBD5E1" }}
              >
                <option value="Car">Car / Private</option>
                <option value="Train">Scenic Train</option>
                <option value="Public Transport">Bus / Public</option>
                <option value="Walking">Walking / Trekking</option>
              </select>
            ) : (
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#0F2B48" }}>{transport}</div>
            )}
          </div>
        </div>

        {/* Interests Badges */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "10px" }}>
            Saved Interests {isEditing && "(Click to toggle)"}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(isEditing ? allInterests : interests).map((item) => {
              const selected = interests.includes(item);
              return (
                <div
                  key={item}
                  onClick={() => toggleInterest(item)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: selected ? "1px solid #0D9488" : "1px solid #CBD5E1",
                    backgroundColor: selected ? "#F0FDFA" : "#F8FAFC",
                    color: selected ? "#0D9488" : "#64748B",
                    fontSize: "0.85rem",
                    fontWeight: selected ? 600 : 400,
                    cursor: isEditing ? "pointer" : "default",
                  }}
                >
                  {selected ? "✓ " : ""}{item}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
