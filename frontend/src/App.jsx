import { useEffect, useState } from "react";

import { API_BASE_URL } from "./apiConfig";
import AuthBar from "./components/AuthBar";
import BudgetDashboard from "./components/BudgetDashboard";
import ExpenseManager from "./components/ExpenseManager";
import ActivityManager from "./components/ActivityManager";
import RiskDashboard from "./components/RiskDashboard";
import ReadinessDashboard from "./components/ReadinessDashboard";
import WorkflowDashboard from "./components/WorkflowDashboard";

function App() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budgetRefreshKey, setBudgetRefreshKey] = useState(0);

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("travelwise_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    try {
      sessionStorage.setItem("travelwise_user", JSON.stringify(userData));
    } catch {
      // storage unavailable or quota exceeded
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem("travelwise_user");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Trips/2`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load trip.");
        }

        return response.json();
      })
      .then((data) => {
        setTrip(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const refreshBudget = () => {
    setBudgetRefreshKey((previous) => previous + 1);
  };

  if (loading) {
    return <h2>Loading TravelWise...</h2>;
  }

  if (error) {
    return <h2>Error: {error}</h2>;
  }

  if (!trip) {
    return <h2>Trip not found.</h2>;
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: "16px" }}>TravelWise</h1>

      <AuthBar user={user} onLogin={handleLogin} onLogout={handleLogout} />

      <h2>Trip Dashboard</h2>

      <p>
        <strong>Starting Place:</strong>{" "}
        {trip.startingPlace}
      </p>

      <p>
        <strong>Destination:</strong>{" "}
        {trip.destination}
      </p>

      <p>
        <strong>Start Date:</strong>{" "}
        {new Date(trip.startDate).toLocaleDateString()}
      </p>

      <p>
        <strong>Return Date:</strong>{" "}
        {new Date(trip.returnDate).toLocaleDateString()}
      </p>

      <p>
        <strong>Budget:</strong>{" "}
        LKR {trip.budgetAmount}
      </p>

      <p>
        <strong>Travellers:</strong>{" "}
        {trip.travellerCount}
      </p>

      <p>
        <strong>Trip Type:</strong>{" "}
        {trip.tripType}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        {trip.status}
      </p>

      <hr />

      <BudgetDashboard
        budgetId={2}
        refreshKey={budgetRefreshKey}
      />

      <hr />

      <ExpenseManager
        tripId={2}
        onExpenseChanged={refreshBudget}
      />

      <hr />

      <ActivityManager tripId={2} />

      <hr />

      <RiskDashboard tripId={2} />

      <hr />

      <ReadinessDashboard tripId={2} />

      <hr />

      <WorkflowDashboard tripId={2} user={user} />
    </div>
  );
}

export default App;
