import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function RiskDashboard({ tripId, trip, destination, user, onNavigate }) {
  const [weather, setWeather] = useState(null);
  const [risk, setRisk] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState("");
  const [checkedPacking, setCheckedPacking] = useState({});

  const targetDestination = trip?.destination || destination || "Ella";

  const loadWeather = async () => {
    if (!tripId) return;
    try {
      setLoadingWeather(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Risk/weather/trip/${tripId}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load live weather information.");
      }

      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadForecastAndAlternatives = async () => {
    if (!targetDestination) return;
    try {
      setLoadingForecast(true);
      const params = new URLSearchParams({ location: targetDestination });
      if (trip?.startDate) params.append("startDate", trip.startDate);
      if (trip?.returnDate) params.append("returnDate", trip.returnDate);
      if (trip?.tripType) params.append("tripType", trip.tripType);

      const response = await fetch(`${API_URL}/api/Risk/weather/forecast?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setForecast(data);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingForecast(false);
    }
  };

  const assessRisk = async () => {
    if (!tripId) return;
    try {
      setLoadingRisk(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Risk/assess/trip/${tripId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to assess trip risk.");
      }

      const data = await response.json();
      setRisk(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRisk(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadWeather();
      loadForecastAndAlternatives();
      assessRisk();
    } else {
      setWeather(null);
      setRisk(null);
      setForecast(null);
    }
  }, [tripId, targetDestination]);

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
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🛡️</div>
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
            Select or plan a trip across Sri Lanka to inspect real-time Open-Meteo weather telemetry, evaluate environmental hazards, and view alternative date suggestions.
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

  const getRiskBadge = (level) => {
    switch (level?.toUpperCase()) {
      case "LOW":
        return <span className="badge badge-success">LOW RISK</span>;
      case "MODERATE":
        return <span className="badge badge-warning">MODERATE RISK</span>;
      case "HIGH":
      case "CRITICAL":
        return <span className="badge badge-danger">{level} RISK</span>;
      default:
        return <span className="badge badge-info">{level || "EVALUATING"}</span>;
    }
  };

  const getWeatherName = (code) => {
    if (code === undefined || code === null) return "Clear Conditions";
    if (code >= 95) return "Thunderstorm";
    if (code >= 80) return "Rain Showers";
    if (code >= 51) return "Drizzle / Rain";
    if (code >= 45) return "Foggy / Mist";
    if (code >= 3) return "Overcast";
    if (code >= 1) return "Partly Cloudy";
    return "Sunny & Clear";
  };

  // Temperature and Wind safe binding
  const temperatureVal = weather?.temperatureC !== undefined ? weather.temperatureC : weather?.temperatureCelsius;
  const windSpeedVal = weather?.windSpeedKph !== undefined ? weather.windSpeedKph : weather?.windSpeedKmh;
  const weatherCondText = weather?.weatherCondition || weather?.weatherSummary || getWeatherName(weather?.weatherCode);

  const togglePackingItem = (item) => {
    setCheckedPacking((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  return (
    <section>
      {/* Page Header */}
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Travel Safety & Weather Intelligence</h2>
          <p className="body-text" style={{ margin: "4px 0 0" }}>
            Deterministic environmental hazard synthesis and live atmospheric telemetry for <strong>{targetDestination}</strong>.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              loadWeather();
              loadForecastAndAlternatives();
            }}
            disabled={loadingWeather}
          >
            {loadingWeather ? "Refreshing..." : "🔄 Refresh Weather"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={assessRisk}
            disabled={loadingRisk}
          >
            {loadingRisk ? "Calculating Risk..." : "🛡️ Re-Assess Risk"}
          </button>
        </div>
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

      {/* Main Top Cards: Weather Telemetry + Risk Score */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "28px" }}>
        {/* Live Weather Card */}
        <div className="tw-card" style={{ margin: 0 }}>
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🌦️</span> Current Weather Telemetry
            </h3>
            <span className="badge badge-info">Open-Meteo Live</span>
          </div>

          {loadingWeather ? (
            <p style={{ textAlign: "center", padding: "28px 0", color: "var(--text-muted)" }}>
              Fetching real-time atmospheric data...
            </p>
          ) : weather ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "3.2rem",
                    fontWeight: 700,
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {temperatureVal !== undefined && temperatureVal !== null ? `${temperatureVal}°C` : "— °C"}
                </span>
                <div>
                  <strong style={{ fontSize: "1.1rem", color: "var(--ink)", display: "block" }}>
                    {weather.location || targetDestination}
                  </strong>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                    {windSpeedVal !== undefined && windSpeedVal !== null ? `Wind: ${windSpeedVal} km/h` : "Wind data active"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--primary-light)",
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Atmospheric Condition
                </div>
                <p style={{ fontSize: "0.92rem", color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                  {weatherCondText}
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                <span>Source: {weather.source || "Open-Meteo Weather API"}</span>
                <span>Coordinates verified</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "12px" }}>
                Weather telemetry not yet loaded.
              </p>
              <button type="button" className="btn btn-outline btn-sm" onClick={loadWeather}>
                Load Live Weather
              </button>
            </div>
          )}
        </div>

        {/* Risk Assessment Card */}
        <div className="tw-card" style={{ margin: 0 }}>
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🛡️</span> Safety Risk Synthesis
            </h3>
            {risk ? getRiskBadge(risk.riskLevel) : <span className="badge badge-info">PENDING ASSESSMENT</span>}
          </div>

          {loadingRisk ? (
            <p style={{ textAlign: "center", padding: "28px 0", color: "var(--text-muted)" }}>
              Evaluating travel hazards & safety thresholds...
            </p>
          ) : risk ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "14px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "3rem",
                    fontWeight: 700,
                    color: risk.riskScore > 60 ? "var(--danger)" : risk.riskScore > 30 ? "var(--warning)" : "var(--success)",
                    lineHeight: 1,
                  }}
                >
                  {risk.riskScore}
                </span>
                <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>/ 100 Risk Score</span>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-surface-alt)",
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
                  Deterministic Safety Assessment
                </div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                  {risk.summary || "No active safety advisories or critical terrain hazards flagged for this itinerary."}
                </p>
              </div>

              {risk.recommendations && (
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--ink)", display: "block", marginBottom: "4px" }}>
                    Safety Guidance:
                  </strong>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                    {risk.recommendations}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🛡️</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
                Synthesize weather, location hazards, and activity risks for {targetDestination}.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={assessRisk}>
                Assess Trip Risk Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: WEATHER-BASED DATE RECOMMENDATION & WINDOWS  */}
      {/* ======================================================== */}
      {forecast && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px" }}>
          {/* Suitability Banner */}
          <div
            className="tw-card"
            style={{
              padding: "20px 24px",
              margin: 0,
              backgroundColor: forecast.isPlannedWeatherSuitable ? "#ecfdf5" : "#fffbeb",
              border: `1px solid ${forecast.isPlannedWeatherSuitable ? "#a7f3d0" : "#fde68a"}`,
              borderLeft: `5px solid ${forecast.isPlannedWeatherSuitable ? "var(--success)" : "var(--warning)"}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <h4
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: forecast.isPlannedWeatherSuitable ? "#065f46" : "#92400e",
                    margin: "0 0 6px",
                  }}
                >
                  {forecast.isPlannedWeatherSuitable
                    ? "✓ Planned Dates Are Favorable for Travel"
                    : "⚠️ Weather Advisory for Planned Departure Dates"}
                </h4>
                <p style={{ fontSize: "0.92rem", color: forecast.isPlannedWeatherSuitable ? "#047857" : "#b45309", lineHeight: "1.5", margin: 0 }}>
                  {forecast.plannedWeatherSummary || (forecast.isPlannedWeatherSuitable
                    ? "Favorable temperatures and manageable precipitation expected throughout your itinerary."
                    : "Heavy rainfall, high wind gusts, or severe cloud cover detected during your requested travel dates.")}
                </p>

                {forecast.unsuitableReasons && forecast.unsuitableReasons.length > 0 && (
                  <ul style={{ margin: "10px 0 0 20px", fontSize: "0.86rem", color: "#92400e" }}>
                    {forecast.unsuitableReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>

              <span
                className="badge"
                style={{
                  backgroundColor: forecast.isPlannedWeatherSuitable ? "#d1fae5" : "#fef3c7",
                  color: forecast.isPlannedWeatherSuitable ? "#065f46" : "#92400e",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                }}
              >
                {forecast.isPlannedWeatherSuitable ? "RECOMMENDED WINDOW" : "CAUTION ADVISED"}
              </span>
            </div>
          </div>

          {/* Alternative Date Suggestions if Unsuitable */}
          {forecast.alternativeDateSuggestions && forecast.alternativeDateSuggestions.length > 0 && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  📅 Smarter Travel Date Alternatives for {targetDestination}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  Weather forecasting algorithms detected superior conditions with reduced rainfall and milder winds.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                {forecast.alternativeDateSuggestions.map((alt, i) => (
                  <div
                    key={i}
                    className="tw-card"
                    style={{
                      margin: 0,
                      borderTop: "4px solid var(--teal)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span className="badge badge-success" style={{ fontSize: "0.75rem" }}>
                          {alt.suitabilityLevel || "Favorable"}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                          Risk: {alt.riskScore} / 100
                        </span>
                      </div>

                      <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)", margin: "0 0 6px" }}>
                        {alt.suggestedStartDate} ➔ {alt.suggestedReturnDate}
                      </h4>

                      <div style={{ fontSize: "0.82rem", color: "var(--teal)", fontWeight: 600, marginBottom: "8px" }}>
                        🌤️ {alt.condition} • {alt.minTemperatureC}°C – {alt.maxTemperatureC}°C
                      </div>

                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                        {alt.reason}
                      </p>
                    </div>

                    <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid var(--border-color)", textAlign: "right" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Tip: Update trip dates in Trip Planning
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Weather Guidance: Safe vs Restricted */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            {/* Safe Activities */}
            <div className="tw-card" style={{ margin: 0, borderLeft: "4px solid var(--success)" }}>
              <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)", margin: "0 0 10px" }}>
                ✓ Weather-Safe Experiences
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Optimal activities recommended for current atmospheric conditions in {targetDestination}:
              </p>
              <ul style={{ margin: "0 0 0 18px", fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: "1.6" }}>
                {(forecast.safeActivityCategories || ["Cultural Heritage Museums & Covered Temples", "Artisanal Tea Factory Tours & Tastings"]).map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            {/* Restricted Activities */}
            <div className="tw-card" style={{ margin: 0, borderLeft: "4px solid var(--danger)" }}>
              <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)", margin: "0 0 10px" }}>
                ⚠️ Restricted or High-Risk Activities
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px" }}>
                Activities to avoid or postpone during heavy rainfall, wet rock terrain, or lightning:
              </p>
              <ul style={{ margin: "0 0 0 18px", fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                {(forecast.restrictedActivityCategories && forecast.restrictedActivityCategories.length > 0
                  ? forecast.restrictedActivityCategories
                  : ["Steep Cliff & Ridge Ascents (Slip Hazard)", "Waterfall Base Plunge Pools (Flash-flood Hazard)"]
                ).map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tailored Packing Recommendations */}
          {forecast.packingRecommendations && forecast.packingRecommendations.length > 0 && (
            <div className="tw-card" style={{ margin: 0 }}>
              <div className="tw-card-header">
                <h3 className="tw-card-title">
                  <span>🎒</span> Weather-Tailored Packing Checklist
                </h3>
                <span className="badge badge-ai">Automated Checklist</span>
              </div>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Check off gear tailored to expected rainfall, temperatures, and excursion types for {targetDestination}:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                {forecast.packingRecommendations.map((item, idx) => {
                  const isChecked = !!checkedPacking[item];
                  return (
                    <label
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isChecked ? "var(--primary-light)" : "var(--bg-surface-alt)",
                        border: `1px solid ${isChecked ? "var(--teal-border)" : "var(--border-color)"}`,
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        color: isChecked ? "var(--ink)" : "var(--text-primary)",
                        textDecoration: isChecked ? "line-through" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePackingItem(item)}
                        style={{ accentColor: "var(--teal)" }}
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default RiskDashboard;

