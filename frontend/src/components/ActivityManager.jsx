import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function ActivityManager({ tripId }) {
  const [activities, setActivities] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "Hiking",
    description: "",
    location: "",
    estimatedCost: "",
    durationMinutes: "",
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

  useEffect(() => {
    if (tripId) {
      loadActivities();
    } else {
      setActivities([]);
      setLoading(false);
    }
  }, [tripId]);

  if (!tripId) {
    return (
      <section>
        <h2 className="page-title">Activities</h2>
        <p className="body-text">Select a saved trip to manage activities.</p>
      </section>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      category: "Hiking",
      description: "",
      location: "",
      estimatedCost: "",
      durationMinutes: "",
      scheduledStart: "",
      scheduledEnd: "",
      status: "PLANNED",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      if (!form.scheduledStart || !form.scheduledEnd) {
        throw new Error("Please select both start and end time.");
      }

      if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
        throw new Error("End time must be after the start time.");
      }

      const activityData = {
        name: form.name,
        category: form.category,
        description: form.description,
        location: form.location,
        estimatedCost: Number(form.estimatedCost),
        durationMinutes: Number(form.durationMinutes),
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
            tripId: tripId,
          }),
        });
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save activity.");
      }

      resetForm();
      await loadActivities();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (activity) => {
    setEditingId(activity.id);
    setForm({
      name: activity.name,
      category: activity.category,
      description: activity.description,
      location: activity.location,
      estimatedCost: activity.estimatedCost ?? "",
      durationMinutes: activity.durationMinutes ?? "",
      scheduledStart: activity.scheduledStart ? activity.scheduledStart.slice(0, 16) : "",
      scheduledEnd: activity.scheduledEnd ? activity.scheduledEnd.slice(0, 16) : "",
      status: activity.status || "PLANNED",
    });
    setShowModal(true);
  };

  const handleDelete = async (activityId) => {
    const confirmed = window.confirm("Are you sure you want to delete this activity?");
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
    let dateKey = "Unscheduled";
    if (act.scheduledStart) {
      const d = new Date(act.scheduledStart);
      dateKey = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(act);
    return acc;
  }, {});

  return (
    <section>
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Experience & Activity Planning</h2>
          <p className="body-text">
            Build your chronological travel itinerary with conflict checks and budget estimations.
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
          + Add Activity
        </button>
      </div>

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

      {loading ? (
        <p style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
          Loading travel experiences...
        </p>
      ) : activities.length === 0 ? (
        <div className="tw-card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📍</div>
          <h4 style={{ margin: "0 0 6px", color: "var(--text-primary)" }}>No activities scheduled</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
            Add your first hike, cultural excursion, or scenic tour to Ella.
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
                  marginBottom: "12px",
                  paddingBottom: "6px",
                  borderBottom: "2px solid var(--border-color)",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>🗓️</span>
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                  {dateLabel}
                </h3>
                <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                  {dayActs.length} {dayActs.length === 1 ? "Activity" : "Activities"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {dayActs.map((act) => {
                  const startTime = act.scheduledStart
                    ? new Date(act.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";
                  const endTime = act.scheduledEnd
                    ? new Date(act.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <div
                      key={act.id}
                      className="tw-card"
                      style={{
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        borderLeft: "4px solid var(--secondary)",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--secondary)" }}>
                            ⏰ {startTime} – {endTime}
                          </span>
                          {getStatusBadge(act.status)}
                        </div>

                        <h4 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-primary)", margin: "0 0 6px" }}>
                          {act.name}
                        </h4>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", fontSize: "0.78rem" }}>
                          <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                            🏷️ {act.category || "General"}
                          </span>
                          <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                            📍 {act.location || "Ella"}
                          </span>
                          <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                            ⏱️ {act.durationMinutes} min
                          </span>
                          <span className="badge" style={{ backgroundColor: "var(--success-bg)", color: "var(--success)" }}>
                            💵 LKR {Number(act.estimatedCost).toLocaleString()}
                          </span>
                        </div>

                        {act.description && (
                          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "12px" }}>
                            {act.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px", borderTop: "1px solid var(--border-color)" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(act)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete(act.id)}
                        >
                          Delete
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

      {/* Add / Edit Activity Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
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
              maxWidth: "520px",
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

            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "6px" }}>
              {editingId !== null ? "Edit Activity" : "Add Experience to Itinerary"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              {editingId !== null ? "Modify the scheduled time, location, or cost." : "Schedule an excursion with date bounds and clash checks."}
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
                  placeholder="e.g. Ella Rock Sunrise Trek"
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
                    required
                  >
                    <option value="Hiking">Hiking</option>
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Food & Dining">Food & Dining</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Relaxation">Relaxation</option>
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
                    placeholder="e.g. Ella, Sri Lanka"
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
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 3500"
                    value={form.estimatedCost}
                    onChange={handleChange}
                    required
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
                    min="1"
                    className="form-input"
                    placeholder="e.g. 180"
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
                  Description / Notes
                </label>
                <textarea
                  id="act-desc"
                  name="description"
                  rows={3}
                  className="form-textarea"
                  placeholder="Trail guidelines, gear recommendations, etc."
                  value={form.description}
                  onChange={handleChange}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingId !== null ? "Save Changes" : "Add Experience"}
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm}>
                  Cancel
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
