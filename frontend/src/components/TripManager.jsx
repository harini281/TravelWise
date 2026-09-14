import { useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";
import TripMapView from "./TripMapView";
import { geocodeLocation, fetchRoadRoute, calculateTransportRecommendations } from "../utils/mapAndRouteService";
import { getRecommendedActivities } from "../utils/destinationRecommendations";

function TripManager({ user, currentTrip, onSelectTrip, onRefreshTrips }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);

  // Wizard form state
  const [startingPlace, setStartingPlace] = useState("Colombo");
  const [destination, setDestination] = useState("Ella");
  const [startDate, setStartDate] = useState("2026-10-10");
  const [returnDate, setReturnDate] = useState("2026-10-13");
  const [budgetAmount, setBudgetAmount] = useState(80000);
  const [travellerCount, setTravellerCount] = useState(2);
  const [tripType, setTripType] = useState(user?.travelStyle || "Adventure");
  const [selectedTransport, setSelectedTransport] = useState("Train");
  const [status, setStatus] = useState("PLANNING");

  // Telemetry & Map Routing State
  const [startCoords, setStartCoords] = useState([6.9271, 79.8612]); // Colombo
  const [destCoords, setDestCoords] = useState([6.8667, 81.0466]); // Ella
  const [polylineCoords, setPolylineCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(210.5);
  const [durationMins, setDurationMins] = useState(330);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [transportOptions, setTransportOptions] = useState([]);
  const [estimatedCost, setEstimatedTransportCost] = useState(4200);

  // Weather Advisory State
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // UI feedback state
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [activityFeedback, setActivityFeedback] = useState("");

  // Load Traveller's trips from PostgreSQL
  const loadTrips = async () => {
    try {
      setLoading(true);
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/Trips`, { headers });
      if (!res.ok) throw new Error("Could not load trips");
      const data = await res.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [user?.token]);

  // Initial geocoding and routing calculation
  useEffect(() => {
    runRoutingAnalysis(startingPlace, destination, travellerCount);
  }, []);

  const runRoutingAnalysis = async (startQuery, destQuery, count) => {
    try {
      setGeocodingLoading(true);
      setFormError("");

      const [startRes, destRes] = await Promise.all([
        geocodeLocation(startQuery),
        geocodeLocation(destQuery),
      ]);

      if (startRes) {
        setStartCoords([startRes.latitude, startRes.longitude]);
      }
      if (destRes) {
        setDestCoords([destRes.latitude, destRes.longitude]);
      }

      if (startRes && destRes) {
        const routeData = await fetchRoadRoute(
          [startRes.latitude, startRes.longitude],
          [destRes.latitude, destRes.longitude]
        );

        if (routeData) {
          setDistanceKm(routeData.distanceKm);
          setDurationMins(routeData.durationMinutes);
          setPolylineCoords(routeData.polylineCoords);
          setRouteGeoJson(routeData.geometryGeoJson);

          const recs = calculateTransportRecommendations(
            routeData.distanceKm,
            routeData.durationMinutes,
            count,
            {
              TransportPreference: user?.transportPreference,
              BudgetStyle: user?.budgetStyle,
            }
          );
          setTransportOptions(recs);

          // Default selected transport
          if (recs.length > 0) {
            const top = recs.find((r) => r.isRecommended) || recs[0];
            setSelectedTransport(top.mode);
            setEstimatedTransportCost(top.estimatedCostLkr);
          }
        }
      }

      // Fetch Weather Advisory for Destination
      fetchWeatherAdvisory(destQuery);
    } catch (err) {
      console.warn("Routing analysis error:", err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  const fetchWeatherAdvisory = async (dest) => {
    if (!dest) return;
    try {
      setWeatherLoading(true);
      const q = encodeURIComponent(dest);
      const t = encodeURIComponent(tripType || "");
      const res = await fetch(`${API_BASE_URL}/api/Risk/weather?location=${q}&tripType=${t}`);
      if (res.ok) {
        const data = await res.json();
        setWeatherAdvisory(data);
      }
    } catch (e) {
      console.warn("Weather advisory error:", e);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleCreateOrUpdateTrip = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (new Date(returnDate) < new Date(startDate)) {
      setFormError("Return date must be on or after the start date.");
      return;
    }

    if (budgetAmount <= 0) {
      setFormError("Budget amount must be greater than zero.");
      return;
    }

    if (travellerCount < 1) {
      setFormError("Traveller count must be at least 1.");
      return;
    }

    const payload = {
      startingPlace: startingPlace.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate).toISOString(),
      returnDate: new Date(returnDate).toISOString(),
      budgetAmount: Number(budgetAmount),
      travellerCount: Number(travellerCount),
      tripType: tripType.trim(),
      status,
      selectedTransport,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMinutes: durationMins,
      estimatedTransportCost: estimatedCost,
      startLatitude: startCoords[0],
      startLongitude: startCoords[1],
      destinationLatitude: destCoords[0],
      destinationLongitude: destCoords[1],
      routeGeometryJson: routeGeoJson,
    };

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      };

      const url = editingTripId
        ? `${API_BASE_URL}/api/Trips/${editingTripId}`
        : `${API_BASE_URL}/api/Trips`;

      const method = editingTripId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to save trip.");
      }

      const savedTrip = await res.json();
      setFormSuccess(editingTripId ? "Trip updated successfully!" : "Trip created successfully!");

      await loadTrips();
      onSelectTrip(savedTrip);
      if (onRefreshTrips) onRefreshTrips();

      setTimeout(() => {
        setShowWizard(false);
        setEditingTripId(null);
        setFormSuccess("");
      }, 1000);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }

    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/Trips/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete trip");

      await loadTrips();
      if (currentTrip?.id === id) {
        const remaining = trips.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          onSelectTrip(remaining[0]);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditTrip = (trip) => {
    setEditingTripId(trip.id);
    setStartingPlace(trip.startingPlace || "Colombo");
    setDestination(trip.destination || "Ella");
    setStartDate(trip.startDate ? trip.startDate.split("T")[0] : "2026-10-10");
    setReturnDate(trip.returnDate ? trip.returnDate.split("T")[0] : "2026-10-13");
    setBudgetAmount(trip.budgetAmount || 80000);
    setTravellerCount(trip.travellerCount || 2);
    setTripType(trip.tripType || "Adventure");
    setSelectedTransport(trip.selectedTransport || "Train");
    setStatus(trip.status || "PLANNING");

    setShowWizard(true);
    runRoutingAnalysis(trip.startingPlace || "Colombo", trip.destination || "Ella", trip.travellerCount || 2);
  };

  const handleAddCuratedActivity = async (activity) => {
    if (!currentTrip?.id) {
      setActivityFeedback("Please select an active trip first.");
      return;
    }

    try {
      setActivityFeedback(`Adding "${activity.name}" to trip itinerary...`);

      const tripStart = new Date(currentTrip.startDate);
      // Schedule activity at 10:00 AM on the second day or start date
      const scheduledStart = new Date(tripStart);
      scheduledStart.setHours(10, 0, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (activity.durationMinutes || 90));

      const payload = {
        tripId: currentTrip.id,
        name: activity.name,
        category: activity.category,
        description: activity.description,
        location: activity.location,
        estimatedCost: activity.estimatedCost,
        durationMinutes: activity.durationMinutes,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
      };

      const res = await fetch(`${API_BASE_URL}/api/Activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Could not add activity to trip.");
      }

      setActivityFeedback(`✓ Successfully added "${activity.name}" to your trip itinerary!`);
      setTimeout(() => setActivityFeedback(""), 4000);
    } catch (err) {
      setActivityFeedback(`Notice: ${err.message}`);
      setTimeout(() => setActivityFeedback(""), 5000);
    }
  };

  const curatedActivities = getRecommendedActivities(
    currentTrip?.destination || destination,
    user?.interests,
    weatherAdvisory?.weatherCondition
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 4px" }}>
            Trip Planning & Itinerary Command
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            Real GIS road telemetry, deterministic transport recommendations, and weather-aware safety.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="auth-btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.9rem" }}
            onClick={() => {
              setEditingTripId(null);
              setShowWizard(true);
            }}
          >
            <span>➕</span> Plan New Trip
          </button>
        </div>
      </div>

      {/* Trips Carousel / Selector */}
      <div className="tw-card">
        <div className="tw-card-header">
          <h3 className="tw-card-title">
            <span>🗺️</span> Your Registered Trips ({trips.length})
          </h3>
          <span className="badge badge-info">Logged-in Traveller: {user?.username}</span>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "16px 0" }}>Loading your trips from database...</p>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎒</div>
            <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>No trips planned yet.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "16px" }}>
              Create your first Sri Lankan travel expedition with real road routing and live weather.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingTripId(null);
                setShowWizard(true);
              }}
            >
              Plan a Trip Now
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {trips.map((t) => {
              const isSelected = currentTrip?.id === t.id;
              const startFmt = t.startDate ? new Date(t.startDate).toLocaleDateString() : "TBD";
              const returnFmt = t.returnDate ? new Date(t.returnDate).toLocaleDateString() : "TBD";

              return (
                <div
                  key={t.id}
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: isSelected ? "2px solid var(--secondary)" : "1px solid var(--border-color)",
                    backgroundColor: isSelected ? "rgba(37, 99, 235, 0.04)" : "var(--bg-surface)",
                    boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    position: "relative",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                        {t.tripType || "Adventure"}
                      </span>
                      <span className="badge" style={{ backgroundColor: isSelected ? "var(--secondary)" : "#64748b", color: "#fff" }}>
                        {t.status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                      {t.startingPlace} ➔ {t.destination}
                    </h4>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      <div>📅 <strong>{startFmt} – {returnFmt}</strong></div>
                      <div>👥 <strong>{t.travellerCount} Travellers</strong> • Budget: <strong>LKR {t.budgetAmount?.toLocaleString()}</strong></div>
                      {t.selectedTransport && (
                        <div style={{ marginTop: "4px", color: "var(--primary)", fontWeight: 600 }}>
                          🚀 Mode: {t.selectedTransport} {t.estimatedDistanceKm ? `(${t.estimatedDistanceKm} km)` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    {!isSelected ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => onSelectTrip(t)}
                      >
                        ✓ Select Active
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--secondary)", alignSelf: "center", flex: 1 }}>
                        ★ Active Trip
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => startEditTrip(t)}
                      title="Edit Trip Parameters"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleDeleteTrip(t.id)}
                      title="Delete Trip"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Inline Trip Creation & Editing Wizard */}
      {showWizard && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
              {editingTripId ? "✏️ Edit Trip Parameters" : "✨ Create Personalized Trip"}
            </h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowWizard(false)}
            >
              ✕ Close
            </button>
          </div>

          {formError && (
            <div style={{ padding: "10px 14px", backgroundColor: "#fee2e2", borderLeft: "4px solid #ef4444", color: "#b91c1c", marginBottom: "16px", borderRadius: "6px", fontSize: "0.88rem" }}>
              {formError}
            </div>
          )}

          {formSuccess && (
            <div style={{ padding: "10px 14px", backgroundColor: "#dcfce7", borderLeft: "4px solid #22c55e", color: "#15803d", marginBottom: "16px", borderRadius: "6px", fontSize: "0.88rem" }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateOrUpdateTrip}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="auth-label">Starting Place</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    className="auth-input"
                    value={startingPlace}
                    onChange={(e) => setStartingPlace(e.target.value)}
                    placeholder="e.g. Colombo, Negombo, Kandy"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="auth-label">Destination</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    className="auth-input"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Ella, Sigiriya, Galle, Jaffna"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => runRoutingAnalysis(startingPlace, destination, travellerCount)}
                    disabled={geocodingLoading}
                    title="Recalculate route & map telemetry"
                  >
                    {geocodingLoading ? "..." : "🔍 Route"}
                  </button>
                </div>
              </div>

              <div>
                <label className="auth-label">Start Date</label>
                <input
                  type="date"
                  className="auth-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Return Date</label>
                <input
                  type="date"
                  className="auth-input"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Total Budget (LKR)</label>
                <input
                  type="number"
                  className="auth-input"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  min="1000"
                  step="1000"
                  required
                />
              </div>

              <div>
                <label className="auth-label">Traveller Count</label>
                <input
                  type="number"
                  className="auth-input"
                  value={travellerCount}
                  onChange={(e) => {
                    const c = parseInt(e.target.value) || 1;
                    setTravellerCount(c);
                    runRoutingAnalysis(startingPlace, destination, c);
                  }}
                  min="1"
                  max="50"
                  required
                />
              </div>

              <div>
                <label className="auth-label">Trip Style / Type</label>
                <select
                  className="auth-input"
                  value={tripType}
                  onChange={(e) => {
                    setTripType(e.target.value);
                    fetchWeatherAdvisory(destination);
                  }}
                >
                  <option value="Adventure">Adventure</option>
                  <option value="Culture & History">Culture & History</option>
                  <option value="Relaxation">Relaxation</option>
                  <option value="Food & Culinary">Food & Culinary</option>
                  <option value="Family">Family</option>
                  <option value="Business">Business</option>
                </select>
              </div>

              <div>
                <label className="auth-label">Status</label>
                <select
                  className="auth-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Live Interactive Map Preview */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary)" }}>
                  🗺️ Live Road Route & Spatial Geolocation
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Powered by OpenStreetMap & OSRM Routing Engine
                </span>
              </div>

              <TripMapView
                startCoords={startCoords}
                destCoords={destCoords}
                startName={startingPlace}
                destName={destination}
                polylineCoords={polylineCoords}
                distanceKm={distanceKm}
                durationMinutes={durationMins}
                height="320px"
              />
            </div>

            {/* Smart Transport Recommendation Matrix */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary)", margin: "0 0 10px" }}>
                🚆 Smart Transport Recommendations (Based on {distanceKm} km route)
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                {transportOptions.map((opt) => {
                  const isChosen = selectedTransport === opt.mode;

                  return (
                    <div
                      key={opt.mode}
                      onClick={() => {
                        setSelectedTransport(opt.mode);
                        setEstimatedTransportCost(opt.estimatedCostLkr);
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        border: isChosen ? "2px solid var(--secondary)" : "1px solid var(--border-color)",
                        backgroundColor: isChosen ? "rgba(37, 99, 235, 0.05)" : "var(--bg-surface-alt)",
                        cursor: "pointer",
                        boxShadow: isChosen ? "var(--shadow-sm)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{opt.icon}</span>
                        {opt.isRecommended && (
                          <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
                            RECOMMENDED
                          </span>
                        )}
                      </div>

                      <strong style={{ fontSize: "0.95rem", display: "block", color: "var(--text-primary)" }}>
                        {opt.mode}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "3px 0" }}>
                        {opt.highlight}
                      </div>

                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--secondary)", marginTop: "8px" }}>
                        LKR {opt.estimatedCostLkr.toLocaleString()}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "normal", marginLeft: "4px" }}>
                          (total for {travellerCount} pax)
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        ⏱️ Est. {opt.durationText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weather & Deterministic Safety Telemetry */}
            {weatherAdvisory && (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: weatherAdvisory.highRiskCaution ? "#fffbeb" : "var(--bg-surface-alt)",
                  border: weatherAdvisory.highRiskCaution ? "1px solid #fde68a" : "1px solid var(--border-color)",
                  marginBottom: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "1.2rem" }}>🌦️</span>
                    <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                      Destination Weather & Deterministic Safety Rules ({weatherAdvisory.location})
                    </strong>
                  </div>
                  <span className={`badge ${weatherAdvisory.riskLevel === "LOW" ? "badge-success" : weatherAdvisory.riskLevel === "MODERATE" ? "badge-warning" : "badge-danger"}`}>
                    {weatherAdvisory.riskLevel} RISK
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
                  Current condition: <strong>{weatherAdvisory.weatherCondition}</strong> ({weatherAdvisory.temperatureC}°C, Wind: {weatherAdvisory.windSpeedKph} km/h)
                </div>

                {/* Safety Rules */}
                <div style={{ marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--primary)" }}>
                    🛡️ Safety Advisory:
                  </span>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {weatherAdvisory.safetyRules.map((rule, idx) => (
                      <li key={idx} style={{ marginBottom: "2px" }}>{rule}</li>
                    ))}
                  </ul>
                </div>

                {/* Packing Checklist */}
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--primary)" }}>
                    🎒 Deterministic Packing Essentials:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                    {weatherAdvisory.packingChecklist.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid var(--border-color)",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowWizard(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="auth-btn-primary"
                style={{ padding: "10px 24px" }}
              >
                {editingTripId ? "💾 Update Trip" : "🚀 Save & Plan Trip"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Trip Details & Interactive Map View */}
      {currentTrip && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Main Trip Card with Real Interactive Map */}
          <div className="tw-card">
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>📍</span> {currentTrip.startingPlace} ➔ {currentTrip.destination} Expedition
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Trip ID #{currentTrip.id} • Registered to {user?.username}
                </span>
              </div>
              <span className="badge badge-info">{currentTrip.status}</span>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <TripMapView
                startCoords={
                  currentTrip.startLatitude && currentTrip.startLongitude
                    ? [currentTrip.startLatitude, currentTrip.startLongitude]
                    : startCoords
                }
                destCoords={
                  currentTrip.destinationLatitude && currentTrip.destinationLongitude
                    ? [currentTrip.destinationLatitude, currentTrip.destinationLongitude]
                    : destCoords
                }
                startName={currentTrip.startingPlace}
                destName={currentTrip.destination}
                polylineCoords={polylineCoords}
                distanceKm={currentTrip.estimatedDistanceKm || distanceKm}
                durationMinutes={currentTrip.estimatedDurationMinutes || durationMins}
                height="360px"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginTop: "16px" }}>
              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Dates</span>
                <strong>
                  {currentTrip.startDate ? new Date(currentTrip.startDate).toLocaleDateString() : "10 Oct 2026"} –{" "}
                  {currentTrip.returnDate ? new Date(currentTrip.returnDate).toLocaleDateString() : "13 Oct 2026"}
                </strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Travellers</span>
                <strong>{currentTrip.travellerCount || 2} Persons</strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Allocated Budget</span>
                <strong>LKR {(currentTrip.budgetAmount || 80000).toLocaleString()}</strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Selected Transport</span>
                <strong style={{ color: "var(--secondary)" }}>
                  {currentTrip.selectedTransport || selectedTransport}
                </strong>
              </div>
            </div>
          </div>

          {/* Curated Recommendations for Destination Matching Onboarding Preferences */}
          <div className="tw-card">
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>✨</span> Curated Recommendations for {currentTrip.destination}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Filtered by your travel profile: {user?.travelStyle || "Adventure"} •{" "}
                  {Array.isArray(user?.interests) ? user.interests.join(", ") : (user?.interests || "Nature, Hiking")}
                </span>
              </div>
            </div>

            {activityFeedback && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: activityFeedback.startsWith("✓") ? "#dcfce7" : "#eff6ff",
                  borderLeft: activityFeedback.startsWith("✓") ? "4px solid #22c55e" : "4px solid #3b82f6",
                  color: activityFeedback.startsWith("✓") ? "#15803d" : "#1e40af",
                  fontSize: "0.88rem",
                  marginBottom: "16px",
                }}
              >
                {activityFeedback}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {curatedActivities.map((act, index) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-alt)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>{act.name}</strong>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{act.category}</span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4", margin: "6px 0" }}>
                      {act.description}
                    </p>

                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      📍 {act.location} • ⏱️ {act.durationMinutes} mins
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "10px" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {act.estimatedCost > 0 ? `LKR ${act.estimatedCost.toLocaleString()}` : "Free Admission"}
                    </span>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddCuratedActivity(act)}
                      title="Save this experience directly to PostgreSQL activity schedule"
                    >
                      ➕ Add to Itinerary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripManager;
