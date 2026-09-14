import { useState } from "react";
import TravelWiseLogo from "./TravelWiseLogo";
import { API_BASE_URL } from "../apiConfig";

export default function OnboardingWizard({ user, onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [travelStyle, setTravelStyle] = useState("Adventure");
  const [interests, setInterests] = useState(["Nature", "Hiking", "Photography"]);
  const [budgetStyle, setBudgetStyle] = useState("Balanced");
  const [activityPace, setActivityPace] = useState("Balanced");
  const [transport, setTransport] = useState("Train");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const travelStyles = [
    { id: "Adventure", label: "Adventure", desc: "Hiking, nature, outdoor activities", icon: "🏕️" },
    { id: "Culture & History", label: "Culture & History", desc: "Temples, museums, heritage sites", icon: "🏛️" },
    { id: "Relaxation", label: "Relaxation", desc: "Beaches, scenic resorts, leisure", icon: "🏖️" },
    { id: "Food & Culinary", label: "Food & Culinary", desc: "Local cuisine, street food, dining", icon: "🍜" },
    { id: "Family", label: "Family", desc: "Kid-friendly activities, comfortable pace", icon: "👨‍👩‍👧‍👦" },
    { id: "Business", label: "Business", desc: "Productive spaces, efficient transit", icon: "💼" },
  ];

  const interestOptions = [
    { id: "Nature", label: "Nature", icon: "🌿" },
    { id: "Hiking", label: "Hiking", icon: "🥾" },
    { id: "Photography", label: "Photography", icon: "📷" },
    { id: "Beaches", label: "Beaches", icon: "🌊" },
    { id: "Wildlife", label: "Wildlife", icon: "🐘" },
    { id: "Historical Places", label: "Historical Places", icon: "🏰" },
    { id: "Museums", label: "Museums", icon: "🖼️" },
    { id: "Food", label: "Food", icon: "🍛" },
    { id: "Shopping", label: "Shopping", icon: "🛍️" },
    { id: "Nightlife", label: "Nightlife", icon: "✨" },
    { id: "Local Experiences", label: "Local Experiences", icon: "🤝" },
    { id: "Adventure Sports", label: "Adventure Sports", icon: "🏄" },
  ];

  const budgetStyles = [
    { id: "Budget Friendly", label: "Budget Friendly", desc: "Make every rupee count. Maximize experience with smart spending.", icon: "🪙" },
    { id: "Balanced", label: "Balanced", desc: "Good value with comfortable stays and selected quality experiences.", icon: "⚖️" },
    { id: "Comfort", label: "Comfort", desc: "Convenience matters. Quality hotels, direct transport, premium comfort.", icon: "🛋️" },
    { id: "Premium", label: "Premium", desc: "Prioritize the best experience. Luxury resorts, fine dining, private tours.", icon: "⭐" },
  ];

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      if (interests.length > 1) {
        setInterests(interests.filter((item) => item !== id));
      }
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      setError("");

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
        throw new Error("Failed to save travel preferences.");
      }

      const updatedProfile = await response.json();
      onComplete({
        ...user,
        ...updatedProfile,
        hasCompletedOnboarding: true,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Header */}
      <header style={{ padding: "20px 32px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <TravelWiseLogo size={28} />
          <span style={{ fontSize: "0.85rem", color: "#64748B", fontWeight: 500 }}>
            Personalizing for <strong>{user?.fullName || user?.username}</strong>
          </span>
        </div>
      </header>

      {/* Main Stepper Card */}
      <main style={{ maxWidth: "780px", width: "100%", margin: "32px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(15, 43, 72, 0.06)",
            padding: "36px 32px",
          }}
        >
          {/* Progress Indicator (matching reference Screen 5) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "32px" }}>
            {[
              { num: 1, label: "Travel Style" },
              { num: 2, label: "Interests" },
              { num: 3, label: "Budget" },
              { num: 4, label: "Preferences" },
            ].map((st, idx, arr) => (
              <div key={st.num} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      backgroundColor: step >= st.num ? "#0F2B48" : "#E2E8F0",
                      color: step >= st.num ? "#FFFFFF" : "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      transition: "all 0.2s",
                    }}
                  >
                    {step > st.num ? "✓" : st.num}
                  </div>
                  <span
                    style={{
                      fontSize: "0.74rem",
                      color: step >= st.num ? "#0F2B48" : "#94A3B8",
                      fontWeight: step === st.num ? 700 : 500,
                      marginTop: "4px",
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div
                    style={{
                      width: "60px",
                      height: "2px",
                      backgroundColor: step > st.num ? "#0F2B48" : "#E2E8F0",
                      margin: "0 10px 18px",
                      transition: "background-color 0.2s",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0F2B48", marginBottom: "6px" }}>
              Let's personalize your experience
            </h1>
            <p style={{ color: "#64748B", fontSize: "0.95rem", margin: 0 }}>
              Tell us a little about your travel preferences to tailor itineraries and recommendations.
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

          {/* STEP 1: Travel Style */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2B48", marginBottom: "16px" }}>
                What type of traveller are you?
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                {travelStyles.map((item) => {
                  const selected = travelStyle === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setTravelStyle(item.id)}
                      style={{
                        padding: "18px 16px",
                        borderRadius: "12px",
                        border: selected ? "2px solid #0D9488" : "1px solid #E2E8F0",
                        backgroundColor: selected ? "rgba(13, 148, 136, 0.05)" : "#FFFFFF",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "1.6rem" }}>{item.icon}</span>
                        {selected && (
                          <span style={{ color: "#0D9488", fontWeight: "bold", fontSize: "1.1rem" }}>✓</span>
                        )}
                      </div>
                      <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0F2B48", margin: "0 0 4px" }}>
                        {item.label}
                      </h4>
                      <p style={{ fontSize: "0.82rem", color: "#64748B", margin: 0, lineHeight: 1.4 }}>
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Interests */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2B48", marginBottom: "6px" }}>
                What do you love doing while travelling?
              </h3>
              <p style={{ color: "#64748B", fontSize: "0.88rem", marginBottom: "18px" }}>
                Select all that apply. We'll use these to recommend attractions and activities.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "10px" }}>
                {interestOptions.map((item) => {
                  const selected = interests.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        border: selected ? "2px solid #0D9488" : "1px solid #E2E8F0",
                        backgroundColor: selected ? "rgba(13, 148, 136, 0.08)" : "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.2rem" }}>{item.icon}</span>
                      <span style={{ fontSize: "0.88rem", fontWeight: selected ? 700 : 500, color: selected ? "#0D9488" : "#334155" }}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Budget Style */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2B48", marginBottom: "16px" }}>
                What's your usual travel budget style?
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {budgetStyles.map((item) => {
                  const selected = budgetStyle === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setBudgetStyle(item.id)}
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        border: selected ? "2px solid #0D9488" : "1px solid #E2E8F0",
                        backgroundColor: selected ? "rgba(13, 148, 136, 0.05)" : "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "1.8rem" }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0F2B48", margin: "0 0 2px" }}>
                          {item.label}
                        </h4>
                        <p style={{ fontSize: "0.85rem", color: "#64748B", margin: 0 }}>{item.desc}</p>
                      </div>
                      {selected && <span style={{ color: "#0D9488", fontWeight: "bold", fontSize: "1.2rem" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Planning Preferences */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2B48", marginBottom: "12px" }}>
                  Preferred Activity Pace
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                  {[
                    { id: "Relaxed", label: "Relaxed", desc: "1-2 activities / day" },
                    { id: "Balanced", label: "Balanced", desc: "3-4 activities / day" },
                    { id: "Packed", label: "Packed", desc: "Full day exploration" },
                  ].map((p) => {
                    const sel = activityPace === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivityPace(p.id)}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          border: sel ? "2px solid #0D9488" : "1px solid #E2E8F0",
                          backgroundColor: sel ? "rgba(13, 148, 136, 0.05)" : "#FFFFFF",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0F2B48" }}>{p.label}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748B", marginTop: "2px" }}>{p.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F2B48", marginBottom: "12px" }}>
                  Preferred Transportation
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                  {[
                    { id: "Car", label: "Car / Private", icon: "🚗" },
                    { id: "Train", label: "Scenic Train", icon: "🚆" },
                    { id: "Public Transport", label: "Bus / Public", icon: "🚌" },
                    { id: "Walking", label: "Walking / Trekking", icon: "🚶" },
                  ].map((t) => {
                    const sel = transport === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setTransport(t.id)}
                        style={{
                          padding: "14px",
                          borderRadius: "10px",
                          border: sel ? "2px solid #0D9488" : "1px solid #E2E8F0",
                          backgroundColor: sel ? "rgba(13, 148, 136, 0.05)" : "#FFFFFF",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          justifyContent: "center",
                        }}
                      >
                        <span>{t.icon}</span>
                        <span style={{ fontWeight: sel ? 700 : 500, fontSize: "0.9rem", color: "#0F2B48" }}>
                          {t.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Stepper Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "36px",
              paddingTop: "24px",
              borderTop: "1px solid #E2E8F0",
            }}
          >
            {step === 1 ? (
              <button
                type="button"
                onClick={onSkip}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748B",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Skip for now
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  backgroundColor: "#F1F5F9",
                  border: "1px solid #CBD5E1",
                  color: "#334155",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.92rem",
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  backgroundColor: "#0F2B48",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "11px 26px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleFinish}
                style={{
                  backgroundColor: "#0D9488",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: saving ? "wait" : "pointer",
                  boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
                }}
              >
                {saving ? "Saving Preferences..." : "Finish Personalization ✓"}
              </button>
            )}
          </div>
        </div>
      </main>

      <footer style={{ padding: "16px 0", textAlign: "center", fontSize: "0.8rem", color: "#94A3B8" }}>
        Preferences can be edited anytime from your Profile settings.
      </footer>
    </div>
  );
}
