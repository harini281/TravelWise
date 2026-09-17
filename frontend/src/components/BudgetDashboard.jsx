import { apiFetch as fetch } from "../apiClient";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

function BudgetDashboard({
  budgetId = 2,
  refreshKey = 0,
}) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBudget() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/Budgets/${budgetId}/health`
        );

        if (!response.ok) {
          throw new Error("Failed to load budget information.");
        }

        const data = await response.json();

        setHealth(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBudget();
  }, [budgetId, refreshKey]);

  if (loading) {
    return <p>Loading budget...</p>;
  }

  if (error) {
    return <p>Budget error: {error}</p>;
  }

  const getRecommendation = () => {
    if (!health) {
      return "No recommendation available.";
    }

    if (health.budgetHealth === "HEALTHY") {
      return "Spending is currently under control.";
    }

    if (health.budgetHealth === "WARNING") {
      return "Spending is increasing. Review upcoming expenses.";
    }

    if (health.budgetHealth === "CRITICAL") {
      return "Budget usage is high. Reduce unnecessary spending.";
    }

    return "Continue monitoring the trip budget.";
  };

  return (
    <section>
      <h2>Budget & Expense Management</h2>

      <p>
        <strong>Total Budget:</strong>{" "}
        LKR {health?.totalBudget ?? 0}
      </p>

      <p>
        <strong>Total Spent:</strong>{" "}
        LKR {health?.totalSpent ?? 0}
      </p>

      <p>
        <strong>Remaining Budget:</strong>{" "}
        LKR {health?.remainingBudget ?? 0}
      </p>

      <p>
        <strong>Spending:</strong>{" "}
        {health?.spendingPercentage ?? 0}%
      </p>

      <p>
        <strong>Budget Health:</strong>{" "}
        {health?.budgetHealth ?? "Unknown"}
      </p>

      <p>
        <strong>Recommendation:</strong>{" "}
        {getRecommendation()}
      </p>
    </section>
  );
}

export default BudgetDashboard;