import { useState } from "react";

const API_URL = "http://localhost:5179";

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

      const response = await fetch(
        `${API_URL}/api/Risk/weather/trip/${tripId}`
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to load weather information."
        );
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

      const response = await fetch(
        `${API_URL}/api/Risk/assess/trip/${tripId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to assess trip risk."
        );
      }

      const data = await response.json();

      setRisk(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRisk(false);
    }
  };

  const getRecommendation = (level) => {
    switch (level) {
      case "LOW":
        return "Weather conditions are favorable. Safe to proceed with scheduled outdoor activities.";
      case "MODERATE":
        return "Weather may affect some outdoor plans. Exercise caution and check daily updates.";
      case "HIGH":
        return "Adverse weather conditions expected. Consider rescheduling outdoor activities or choosing indoor alternatives.";
      case "CRITICAL":
        return "Severe weather warning. High-risk activities must be halted or reviewed immediately.";
      default:
        return "Continue monitoring local weather updates.";
    }
  };

  return (
    <section>
      <h2>Travel Safety & Risk Management</h2>

      <div>
        <button
          type="button"
          onClick={loadWeather}
          disabled={loadingWeather}
        >
          {loadingWeather
            ? "Loading Weather..."
            : "Check Weather"}
        </button>

        <button
          type="button"
          onClick={assessRisk}
          disabled={loadingRisk}
        >
          {loadingRisk
            ? "Assessing Risk..."
            : "Assess Trip Risk"}
        </button>
      </div>

      {error && (
        <p style={{ color: "red" }}>
          <strong>Notice / Safe Failure:</strong> {error}
        </p>
      )}

      <hr />

      <h3>Weather Information</h3>

      {!weather ? (
        <p>No weather information loaded yet.</p>
      ) : (
        <div>
          <p>
            <strong>Location:</strong>{" "}
            {weather.location}
          </p>

          <p>
            <strong>Temperature:</strong>{" "}
            {weather.temperatureC} °C
          </p>

          <p>
            <strong>Wind Speed:</strong>{" "}
            {weather.windSpeedKph} km/h
          </p>

          <p>
            <strong>Weather Code:</strong>{" "}
            {weather.weatherCode}
          </p>

          <p>
            <strong>Source:</strong>{" "}
            {weather.source}
          </p>
        </div>
      )}

      <hr />

      <h3>Trip Risk Assessment</h3>

      {!risk ? (
        <p>No risk assessment completed yet.</p>
      ) : (
        <div>
          <p>
            <strong>Risk Score:</strong>{" "}
            {risk.riskScore}
          </p>

          <p>
            <strong>Risk Level:</strong>{" "}
            {risk.riskLevel}
          </p>

          <p>
            <strong>Summary:</strong>{" "}
            {risk.summary}
          </p>

          <p>
            <strong>Recommendation:</strong>{" "}
            {risk.recommendation || getRecommendation(risk.riskLevel)}
          </p>
        </div>
      )}
    </section>
  );
}

export default RiskDashboard;