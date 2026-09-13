import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function ActivityManager({ tripId = 2 }) {
  const [activities, setActivities] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    location: "",
    estimatedCost: "",
    durationMinutes: "",
    scheduledStart: "",
    scheduledEnd: "",
    status: "PLANNED",
  });

  // READ - Load all activities for the trip
  const loadActivities = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/Activities/trip/${tripId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load activities.");
      }

      const data = await response.json();
      setActivities(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [tripId]);

  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      description: "",
      location: "",
      estimatedCost: "",
      durationMinutes: "",
      scheduledStart: "",
      scheduledEnd: "",
      status: "PLANNED",
    });

    setEditingId(null);
  };

  // CREATE or UPDATE
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      if (!form.scheduledStart || !form.scheduledEnd) {
        throw new Error(
          "Please select both start and end time."
        );
      }

      if (
        new Date(form.scheduledEnd) <=
        new Date(form.scheduledStart)
      ) {
        throw new Error(
          "End time must be after the start time."
        );
      }

      const activityData = {
        name: form.name,
        category: form.category,
        description: form.description,
        location: form.location,
        estimatedCost: Number(form.estimatedCost),
        durationMinutes: Number(form.durationMinutes),
        scheduledStart: new Date(
          form.scheduledStart
        ).toISOString(),
        scheduledEnd: new Date(
          form.scheduledEnd
        ).toISOString(),
        status: form.status,
      };

      let response;

      // UPDATE
      if (editingId !== null) {
        response = await fetch(
          `${API_URL}/api/Activities/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(activityData),
          }
        );
      }

      // CREATE
      else {
        response = await fetch(
          `${API_URL}/api/Activities`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tripId: tripId,
              ...activityData,
            }),
          }
        );
      }

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            (editingId !== null
              ? "Failed to update activity."
              : "Failed to add activity.")
        );
      }

      resetForm();
      await loadActivities();
    } catch (err) {
      setError(err.message);
    }
  };

  // Load selected activity into form
  const handleEdit = (activity) => {
    setEditingId(activity.id);

    setForm({
      name: activity.name ?? "",
      category: activity.category ?? "",
      description: activity.description ?? "",
      location: activity.location ?? "",
      estimatedCost: activity.estimatedCost ?? "",
      durationMinutes: activity.durationMinutes ?? "",
      scheduledStart: activity.scheduledStart
        ? activity.scheduledStart.slice(0, 16)
        : "",
      scheduledEnd: activity.scheduledEnd
        ? activity.scheduledEnd.slice(0, 16)
        : "",
      status: activity.status ?? "PLANNED",
    });
  };

  // DELETE
  const handleDelete = async (activityId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this activity?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/Activities/${activityId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to delete activity."
        );
      }

      if (editingId === activityId) {
        resetForm();
      }

      await loadActivities();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>Experience & Activity Planning</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="activityName">
            Activity Name:{" "}
          </label>

          <input
            id="activityName"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="activityCategory">
            Category:{" "}
          </label>

          <select
            id="activityCategory"
            name="category"
            value={form.category}
            onChange={handleChange}
            required
          >
            <option value="">
              Select category
            </option>

            <option value="Hiking">
              Hiking
            </option>

            <option value="Nature">
              Nature
            </option>

            <option value="Photography">
              Photography
            </option>

            <option value="Adventure">
              Adventure
            </option>

            <option value="Culture">
              Culture
            </option>

            <option value="Food">
              Food
            </option>

            <option value="Relaxation">
              Relaxation
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="activityDescription">
            Description:{" "}
          </label>

          <input
            id="activityDescription"
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="activityLocation">
            Location:{" "}
          </label>

          <input
            id="activityLocation"
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="estimatedCost">
            Estimated Cost (LKR):{" "}
          </label>

          <input
            id="estimatedCost"
            type="number"
            name="estimatedCost"
            value={form.estimatedCost}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label htmlFor="durationMinutes">
            Duration (Minutes):{" "}
          </label>

          <input
            id="durationMinutes"
            type="number"
            name="durationMinutes"
            value={form.durationMinutes}
            onChange={handleChange}
            min="1"
            required
          />
        </div>

        <div>
          <label htmlFor="scheduledStart">
            Start Time:{" "}
          </label>

          <input
            id="scheduledStart"
            type="datetime-local"
            name="scheduledStart"
            value={form.scheduledStart}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="scheduledEnd">
            End Time:{" "}
          </label>

          <input
            id="scheduledEnd"
            type="datetime-local"
            name="scheduledEnd"
            value={form.scheduledEnd}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="activityStatus">
            Status:{" "}
          </label>

          <select
            id="activityStatus"
            name="status"
            value={form.status}
            onChange={handleChange}
            required
          >
            <option value="PLANNED">
              Planned
            </option>

            <option value="CONFIRMED">
              Confirmed
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>
        </div>

        <button type="submit">
          {editingId !== null
            ? "Update Activity"
            : "Add Activity"}
        </button>

        {editingId !== null && (
          <button
            type="button"
            onClick={resetForm}
          >
            Cancel Edit
          </button>
        )}
      </form>

      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}

      <hr />

      <h3>Activity Schedule</h3>

      {loading ? (
        <p>Loading activities...</p>
      ) : activities.length === 0 ? (
        <p>No activities planned yet.</p>
      ) : (
        <div>
          {activities.map((activity) => (
            <div key={activity.id}>
              <h4>{activity.name}</h4>

              <p>
                <strong>Category:</strong>{" "}
                {activity.category}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {activity.description}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {activity.location}
              </p>

              <p>
                <strong>Estimated Cost:</strong>{" "}
                LKR {activity.estimatedCost}
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {activity.durationMinutes} minutes
              </p>

              <p>
                <strong>Start:</strong>{" "}
                {activity.scheduledStart
                  ? new Date(
                      activity.scheduledStart
                    ).toLocaleString()
                  : "Not scheduled"}
              </p>

              <p>
                <strong>End:</strong>{" "}
                {activity.scheduledEnd
                  ? new Date(
                      activity.scheduledEnd
                    ).toLocaleString()
                  : "Not scheduled"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {activity.status}
              </p>

              <button
                type="button"
                onClick={() =>
                  handleEdit(activity)
                }
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(activity.id)
                }
              >
                Delete
              </button>

              <hr />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ActivityManager;