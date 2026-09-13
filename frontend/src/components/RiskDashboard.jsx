import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function RiskDashboard({ tripId = 2 }) {
  const [weather, setWeather] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [error, setError] = useState("");

  const loadWeather = async () => {
    try {
      setLoadingWeather(true);
      setError("");

      const response = await fetch(`${API_URL}/api/Risk/weather/trip/${tripId}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load weather information.");
      }

      const data = await response.json();
      setWeather(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingWeather(false);
    }
  };

  const assessRisk = async () => {
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
    loadWeather();
  }, [tripId]);

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

  return (
    <section>
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Travel Safety & Risk</h2>
          <p className="body-text">
            Continuous environmental monitoring and deterministic safety risk synthesis.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadWeather}
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
            {loadingRisk ? "Calculating Risk..." : "🛡️ Assess Trip Risk"}
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Live Weather Card */}
        <div className="tw-card">
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🌦️</span> Current Weather Telemetry
            </h3>
            <span className="badge badge-info">LIVE FEED</span>
          </div>

          {loadingWeather ? (
            <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
              Fetching real-time weather from Open-Meteo...
            </p>
          ) : weather ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "16px" }}>
                <span style={{ fontSize: "2.8rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-1px" }}>
                  {weather.temperatureCelsius}°C
                </span>
                <div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--text-primary)", display: "block" }}>
                    Ella, Sri Lanka
                  </strong>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    Wind: {weather.windSpeedKmh} km/h
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-surface-alt)",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                  Atmospheric Conditions
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {weather.weatherSummary || "Clear weather conditions reported for outdoor travel."}
                </p>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Weather data provided through Open-Meteo
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
        <div className="tw-card">
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🛡️</span> Safety Risk Synthesis
            </h3>
            {risk ? getRiskBadge(risk.riskLevel) : <span className="badge badge-info">PENDING ASSESSMENT</span>}
          </div>

          {loadingRisk ? (
            <p style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
              Evaluating travel hazards & safety thresholds...
            </p>
          ) : risk ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "14px" }}>
                <span style={{ fontSize: "2.4rem", fontWeight: "800", color: "var(--text-primary)" }}>
                  {risk.riskScore}
                </span>
                <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ 100 Risk Score</span>
              </div>

              <div
                style={{
                  backgroundColor: "var(--bg-surface-alt)",
                  padding: "14px",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                  Deterministic Safety Assessment
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {risk.summary || "No active safety advisories or critical terrain hazards flagged for this itinerary."}
                </p>
              </div>

              {risk.recommendations && (
                <div>
                  <strong style={{ fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>
                    Safety Recommendations:
                  </strong>
                  <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                    {risk.recommendations}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🛡️</div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
                Click below to synthesize current weather, location hazards, and activity risks.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={assessRisk}>
                Assess Trip Risk Now
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default RiskDashboard;
