import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("http://localhost:5179/api/Trips/2")
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
    <div>
      <h1>TravelWise</h1>

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

      <ReadinessDashboard tripId={2} />

        <hr />

       <WorkflowDashboard tripId={2} />
        </div>
  );
}

export default App;
