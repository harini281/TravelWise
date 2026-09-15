import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";
import { getRecommendedActivities } from "../utils/destinationRecommendations";

const API_URL = API_BASE_URL;

function ActivityManager({ tripId, trip, user, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Hiking & Trekking",
    description: "",
    location: "",
    estimatedCost: "",
    durationMinutes: "90",
    scheduledStart: "",
    scheduledEnd: "",
    status: "PLANNED",
  });

  const loadActivities = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Activities/trip/${tripId}`);
      if (!response.ok) throw new Error("Failed to load activities.");

      const data = await response.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = async () => {
    if (!tripId) return;
    try {
      const response = await fetch(`${API_URL}/api/Risk/weather/trip/${tripId}`);
      if (response.ok) {
        const data = await response.json();
        const cond = data.weatherCondition || (data.weatherCode >= 51 ? "Rain" : "Clear");
        setWeatherCondition(cond);
      }
    } catch {
      // Non-blocking fallback
    }
  };

  useEffect(() => {
    if (tripId) {
      loadActivities();
      loadWeather();
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [tripId]);

  // Empty state when no trip is active/planned
  if (!tripId || !trip) {
    return (
      <section style={{ maxWidth: "800px", margin: "40px auto", padding: "0 16px" }}>
        <div
          className="tw-card"
          style={{
            textAlign: "center",
            padding: "56px 24px",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>📍</div>
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "2.1rem",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "12px",
            }}
          >
            Where will you go next?
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "1rem",
              lineHeight: "1.6",
              maxWidth: "520px",
              margin: "0 auto 28px",
            }}
          >
            Select or plan a trip across Sri Lanka to schedule travel activities, explore curated local experiences, and balance itinerary pacing.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate && onNavigate("trip")}
            >
              ➕ Plan Your First Trip
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate && onNavigate("trip")}
            >
              Explore Destinations
            </button>
          </div>
        </div>
      </section>
    );
  }

  // Parse user interests
  let userInterests = [];
  if (Array.isArray(user?.interests)) {
    userInterests = user.interests;
  } else if (typeof user?.interests === "string") {
    try {
      userInterests = JSON.parse(user.interests);
    } catch {
      userInterests = user.interests.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Fetch recommended curated activities
  const destination = trip?.destination || "Ella";
  const recommended = getRecommendedActivities(destination, userInterests, weatherCondition);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => {
      const updated = { ...previous, [name]: value };
      // Auto-compute scheduledEnd if scheduledStart and durationMinutes are set
      if (name === "scheduledStart" && value && updated.durationMinutes) {
        try {
          const s = new Date(value);
          const e = new Date(s.getTime() + Number(updated.durationMinutes) * 60000);
          updated.scheduledEnd = e.toISOString().slice(0, 16);
        } catch {
          // ignore
        }
      }
      return updated;
    });
  };

  const resetForm = () => {
    // Default start time: trip.startDate at 09:00 AM if available
    let defaultStart = "";
    let defaultEnd = "";
    if (trip?.startDate) {
      try {
        const d = new Date(trip.startDate);
        d.setHours(9, 0, 0, 0);
        defaultStart = d.toISOString().slice(0, 16);
        const dend = new Date(d.getTime() + 90 * 60000);
        defaultEnd = dend.toISOString().slice(0, 16);
      } catch {
        // ignore
      }
    }

    setForm({
      name: "",
      category: "Hiking & Trekking",
      description: "",
      location: trip?.destination || "",
      estimatedCost: "",
      durationMinutes: "90",
      scheduledStart: defaultStart,
      scheduledEnd: defaultEnd,
      status: "PLANNED",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handlePreFillCurated = (act) => {
    let startStr = "";
    let endStr = "";
    if (trip?.startDate) {
      try {
        const d = new Date(trip.startDate);
        d.setHours(10, 0, 0, 0);
        startStr = d.toISOString().slice(0, 16);
        const dend = new Date(d.getTime() + (act.durationMinutes || 90) * 60000);
        endStr = dend.toISOString().slice(0, 16);
      } catch {
        // ignore
      }
    }

    setForm({
      name: act.name,
      category: act.category,
      description: act.description,
      location: act.location,
      estimatedCost: String(act.estimatedCost || 0),
      durationMinutes: String(act.durationMinutes || 90),
      scheduledStart: startStr,
      scheduledEnd: endStr,
      status: "PLANNED",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setSuccessMsg("");

      if (!form.scheduledStart || !form.scheduledEnd) {
        throw new Error("Please select both scheduled start and end time.");
      }

      if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
        throw new Error("End time must be after the start time.");
      }

      const activityData = {
        name: form.name.trim(),
        category: form.category,
        description: form.description.trim(),
        location: form.location.trim(),
        estimatedCost: Number(form.estimatedCost) || 0,
        durationMinutes: Number(form.durationMinutes) || 60,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
        status: form.status,
      };

      let response;

      if (editingId !== null) {
        response = await fetch(`${API_URL}/api/Activities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityData),
        });
      } else {
        response = await fetch(`${API_URL}/api/Activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...activityData,
            tripId: Number(tripId),
          }),
        });
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save activity.");
      }

      setSuccessMsg(`✓ Activity "${form.name}" successfully ${editingId !== null ? "updated" : "added to itinerary"}.`);
      resetForm();
      await loadActivities();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (activity) => {
    setEditingId(activity.id);
    setForm({
      name: activity.name,
      category: activity.category || "Sightseeing",
      description: activity.description || "",
      location: activity.location || "",
      estimatedCost: activity.estimatedCost !== null && activity.estimatedCost !== undefined ? String(activity.estimatedCost) : "",
      durationMinutes: activity.durationMinutes ? String(activity.durationMinutes) : "60",
      scheduledStart: activity.scheduledStart ? activity.scheduledStart.slice(0, 16) : "",
      scheduledEnd: activity.scheduledEnd ? activity.scheduledEnd.slice(0, 16) : "",
      status: activity.status || "PLANNED",
    });
    setShowModal(true);
  };

  const handleDelete = async (activityId) => {
    const confirmed = window.confirm("Are you sure you want to remove this activity from your itinerary?");
    if (!confirmed) return;

    try {
      setError("");
      const response = await fetch(`${API_URL}/api/Activities/${activityId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to delete activity.");
      }

      if (editingId === activityId) resetForm();
      await loadActivities();
      setSuccessMsg("✓ Activity removed from itinerary.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case "CONFIRMED":
      case "COMPLETED":
        return <span className="badge badge-success">{status}</span>;
      case "CANCELLED":
        return <span className="badge badge-danger">{status}</span>;
      default:
        return <span className="badge badge-info">{status || "PLANNED"}</span>;
    }
  };

  // Group activities by Date (YYYY-MM-DD)
  const groupedActivities = activities.reduce((acc, act) => {
    let dateKey = "Unscheduled / Floating";
    if (act.scheduledStart) {
      const d = new Date(act.scheduledStart);
      dateKey = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(act);
    return acc;
  }, {});

  // Sort activities within each day by start time
  Object.keys(groupedActivities).forEach((key) => {
    groupedActivities[key].sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart));
  });

  // Calculate totals
  const totalCost = activities.reduce((sum, a) => sum + (Number(a.estimatedCost) || 0), 0);
  const totalDurationMinutes = activities.reduce((sum, a) => sum + (Number(a.durationMinutes) || 0), 0);

  const isRainy = weatherCondition.toLowerCase().includes("rain") || weatherCondition.toLowerCase().includes("drizzle");

  return (
    <section>
      {/* Top Header */}
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Experience & Activity Planning</h2>
          <p className="body-text" style={{ margin: "4px 0 0" }}>
            Curate experiences, monitor scheduling conflicts, and track excursion costs for <strong>{destination}</strong>.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          ➕ Add Custom Activity
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            backgroundColor: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div
          style={{
            backgroundColor: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            color: "var(--success)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            fontSize: "0.9rem",
          }}
        >
          {successMsg}
        </div>
      )}

      {/* Weather Advisory Banner */}
      <div
        className="tw-card"
        style={{
          padding: "16px 20px",
          marginBottom: "24px",
          backgroundColor: isRainy ? "#fffbeb" : "var(--primary-light)",
          border: `1px solid ${isRainy ? "#fde68a" : "var(--teal-border)"}`,
          display: "flex",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "1.8rem" }}>{isRainy ? "🌧️" : "☀️"}</span>
        <div style={{ flex: 1 }}>
          <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.95rem" }}>
            {isRainy
              ? `Advisory for ${destination}: Rain Reported`
              : `Current Weather for ${destination}: ${weatherCondition || "Sunny & Clear"}`}
          </strong>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {isRainy
              ? "Recommending indoor artisanal tea tours, cooking masterclasses, and historic museums to protect your itinerary from wet trail conditions."
              : "Outdoor panoramic ridge climbs, historic viaduct walks, and nature preserves are primed for exploration."}
          </span>
        </div>
        <span className="badge badge-info" style={{ alignSelf: "center" }}>
          Live Open-Meteo Feed
        </span>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="tw-card" style={{ margin: 0, padding: "18px 20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Scheduled Activities
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>
            {activities.length}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Total planned excursions
          </div>
        </div>

        <div className="tw-card" style={{ margin: 0, padding: "18px 20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Estimated Activity Cost
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--teal)", marginTop: "4px" }}>
            LKR {totalCost.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {trip?.budgetAmount ? `${((totalCost / trip.budgetAmount) * 100).toFixed(1)}% of trip budget` : "Itinerary estimate"}
          </div>
        </div>

        <div className="tw-card" style={{ margin: 0, padding: "18px 20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
            Total Experience Time
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>
            {Math.floor(totalDurationMinutes / 60)}h {totalDurationMinutes % 60}m
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Across {Object.keys(groupedActivities).length} scheduled days
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: CURATED RECOMMENDATIONS FOR DESTINATION       */}
      {/* ======================================================== */}
      <div style={{ marginBottom: "36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              ✨ Recommended Experiences for {destination}
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Curated Sri Lankan attractions prioritized by your interests and live weather suitability.
            </p>
          </div>
          <span className="badge badge-ai">Personalized Discovery</span>
        </div>

        {recommended.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No specific curated highlights cataloged for {destination}. You can add any custom excursion using the button above.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {recommended.map((act) => {
              const matchesInterest = act.matchedInterests?.some((i) => userInterests.includes(i));
              const isRainSafe = act.weatherSuitability?.includes("Rain");

              return (
                <div
                  key={act.name}
                  className="tw-card"
                  style={{
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderTop: `4px solid ${matchesInterest ? "var(--teal)" : "var(--border-color)"}`,
                    position: "relative",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: matchesInterest ? "var(--teal-light)" : "var(--bg-surface-alt)",
                          color: matchesInterest ? "var(--teal)" : "var(--text-secondary)",
                          fontWeight: 600,
                        }}
                      >
                        {act.category}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: isRainSafe ? "#ecfdf5" : "#eff6ff",
                          color: isRainSafe ? "#047857" : "#1d4ed8",
                          fontSize: "0.75rem",
                        }}
                      >
                        {isRainSafe ? "☔ Rain Friendly" : "☀️ Clear Sky"}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "1.15rem",
                        fontWeight: 600,
                        color: "var(--ink)",
                        margin: "0 0 6px",
                        lineHeight: "1.35",
                      }}
                    >
                      {act.name}
                    </h4>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "14px" }}>
                      {act.description}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "14px" }}>
                      <div>📍 {act.location}</div>
                      <div>⏱️ Est. Duration: {act.durationMinutes} mins</div>
                      <div style={{ color: act.estimatedCost === 0 ? "var(--success)" : "var(--text-primary)", fontWeight: 600 }}>
                        💵 {act.estimatedCost === 0 ? "Free Admission / Scenic Landmark" : `LKR ${act.estimatedCost.toLocaleString()}`}
                      </div>
                      {matchesInterest && (
                        <div style={{ color: "var(--teal)", fontWeight: 600, marginTop: "2px" }}>
                          🎯 Matches your onboarding interests
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{
                      width: "100%",
                      borderColor: "var(--teal)",
                      color: "var(--teal)",
                      fontWeight: 600,
                    }}
                    onClick={() => handlePreFillCurated(act)}
                  >
                    ➕ Add to Itinerary
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: SCHEDULED ITINERARY TIMELINE                  */}
      {/* ======================================================== */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              🗓️ Your Scheduled Itinerary
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
              Chronological schedule grouped by day with automated clash detection.
            </p>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
            Loading travel experiences...
          </p>
        ) : activities.length === 0 ? (
          <div className="tw-card" style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: "2.4rem", marginBottom: "12px" }}>🗓️</div>
            <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", margin: "0 0 8px", color: "var(--text-primary)" }}>
              No activities scheduled yet
            </h4>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", marginBottom: "20px", maxWidth: "420px", margin: "0 auto 20px" }}>
              Select any of the recommended highlights above or click below to schedule your own excursion.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              Schedule Experience
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.entries(groupedActivities).map(([dateLabel, dayActs]) => (
              <div key={dateLabel}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "14px",
                    paddingBottom: "8px",
                    borderBottom: "2px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>🗓️</span>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    {dateLabel}
                  </h3>
                  <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                    {dayActs.length} {dayActs.length === 1 ? "Activity" : "Activities"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {dayActs.map((act, index) => {
                    const startTime = act.scheduledStart
                      ? new Date(act.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "TBD";
                    const endTime = act.scheduledEnd
                      ? new Date(act.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "TBD";

                    // Check for overlap with next activity in the same day
                    let hasConflict = false;
                    if (index < dayActs.length - 1) {
                      const currentEnd = new Date(act.scheduledEnd).getTime();
                      const nextStart = new Date(dayActs[index + 1].scheduledStart).getTime();
                      if (currentEnd > nextStart) {
                        hasConflict = true;
                      }
                    }

                    return (
                      <div
                        key={act.id}
                        className="tw-card"
                        style={{
                          margin: 0,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          borderLeft: hasConflict ? "4px solid var(--danger)" : "4px solid var(--teal)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--teal)" }}>
                              ⏰ {startTime} – {endTime}
                            </span>
                            {getStatusBadge(act.status)}
                          </div>

                          {hasConflict && (
                            <div
                              style={{
                                backgroundColor: "var(--danger-bg)",
                                color: "var(--danger)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                marginBottom: "8px",
                              }}
                            >
                              ⚠️ Time conflict: Overlaps with next excursion
                            </div>
                          )}

                          <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
                            {act.name}
                          </h4>

                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px", fontSize: "0.78rem" }}>
                            <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                              🏷️ {act.category || "General"}
                            </span>
                            <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                              📍 {act.location || destination}
                            </span>
                            <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                              ⏱️ {act.durationMinutes} min
                            </span>
                            <span className="badge" style={{ backgroundColor: "var(--success-bg)", color: "var(--success)", fontWeight: 600 }}>
                              💵 LKR {Number(act.estimatedCost).toLocaleString()}
                            </span>
                          </div>

                          {act.description && (
                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "12px" }}>
                              {act.description}
                            </p>
                          )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleEdit(act)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                            onClick={() => handleDelete(act.id)}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT ACTIVITY                               */}
      {/* ======================================================== */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(9, 43, 58, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) resetForm();
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={resetForm}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
              title="Close modal"
            >
              ✕
            </button>

            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              {editingId !== null ? "✏️ Edit Activity" : "✨ Schedule Experience"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", marginBottom: "20px" }}>
              {editingId !== null
                ? "Modify the scheduled time, location, or estimated cost."
                : "Schedule an excursion with timing constraints and budget estimation."}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="act-name">
                  Activity Name
                </label>
                <input
                  id="act-name"
                  name="name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Nine Arches Rail Walk, Temple of the Tooth"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="act-category">
                    Category
                  </label>
                  <select
                    id="act-category"
                    name="category"
                    className="form-select"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="Hiking & Trekking">Hiking & Trekking</option>
                    <option value="Culture & Heritage">Culture & Heritage</option>
                    <option value="Culinary & Dining">Culinary & Dining</option>
                    <option value="Photography & Landmarks">Photography & Landmarks</option>
                    <option value="Nature & Wildlife">Nature & Wildlife</option>
                    <option value="Water Sports & Marine">Water Sports & Marine</option>
                    <option value="Relaxation & Wellness">Relaxation & Wellness</option>
                    <option value="Museums & History">Museums & History</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="act-location">
                    Location
                  </label>
                  <input
                    id="act-location"
                    name="location"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ella, Kandy, Galle Fort"
                    value={form.location}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="act-cost">
                    Estimated Cost (LKR)
                  </label>
                  <input
                    id="act-cost"
                    name="estimatedCost"
                    type="number"
                    min="0"
                    step="50"
                    className="form-input"
                    placeholder="0"
                    value={form.estimatedCost}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="act-duration">
                    Duration (Minutes)
                  </label>
                  <input
                    id="act-duration"
                    name="durationMinutes"
                    type="number"
                    min="15"
                    step="15"
                    className="form-input"
                    placeholder="90"
                    value={form.durationMinutes}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="act-start">
                    Scheduled Start
                  </label>
                  <input
                    id="act-start"
                    name="scheduledStart"
                    type="datetime-local"
                    className="form-input"
                    value={form.scheduledStart}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="act-end">
                    Scheduled End
                  </label>
                  <input
                    id="act-end"
                    name="scheduledEnd"
                    type="datetime-local"
                    className="form-input"
                    value={form.scheduledEnd}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="act-status">
                  Status
                </label>
                <select
                  id="act-status"
                  name="status"
                  className="form-select"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="act-desc">
                  Notes & Details
                </label>
                <textarea
                  id="act-desc"
                  name="description"
                  rows={3}
                  className="form-textarea"
                  placeholder="Ticket booking notes, dress code requirements (e.g. temple shoulders covered), guide contacts..."
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId !== null ? "Save Changes" : "Add to Itinerary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ActivityManager;
