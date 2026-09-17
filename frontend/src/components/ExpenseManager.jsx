import { apiFetch as fetch } from "../apiClient";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "./TravelWiseUI";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

const CATEGORY_ICONS = {
  Transport: "🚆",
  Accommodation: "🏨",
  Food: "🍛",
  Activities: "🎟️",
  Emergency: "🛡️",
  "Return Journey": "🔁",
  Other: "📦",
};

function ExpenseManager({ tripId, trip, user, onNavigate, onExpenseChanged }) {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals & form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    budgetCategoryId: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 16),
    paymentMethod: "CASH",
  });

  // Food plan form
  const [foodPlanForm, setFoodPlanForm] = useState({
    foodBudget: "",
    budgetStyle: "Balanced",
  });

  // Accommodation plan form
  const [accommodationForm, setAccommodationForm] = useState({
    accommodationBudget: "",
    nightlyRate: "",
  });

  // Return reserve form
  const [returnReserveAmount, setReturnReserveAmount] = useState("");

  // Allocation editor form
  const [allocationInputs, setAllocationInputs] = useState({});

  const loadBudgetAndExpenses = async () => {
    if (!tripId) {
      setSummary(null);
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [sumRes, expRes] = await Promise.all([
        fetch(`${API_URL}/api/Budgets/trip/${tripId}/summary`),
        fetch(`${API_URL}/api/Expenses/trip/${tripId}`),
      ]);

      if (!sumRes.ok) {
        throw new Error("Failed to load trip budget summary.");
      }

      const sumData = await sumRes.json();
      setSummary(sumData);

      // Pre-fill sub-forms
      setFoodPlanForm({
        foodBudget: sumData.foodBudget ? String(sumData.foodBudget) : "",
        budgetStyle: sumData.budgetStyle || "Balanced",
      });
      setAccommodationForm({
        accommodationBudget: sumData.accommodationBudget ? String(sumData.accommodationBudget) : "",
        nightlyRate: sumData.nightlyAccommodationRate ? String(sumData.nightlyAccommodationRate) : "",
      });
      setReturnReserveAmount(sumData.returnReserve ? String(sumData.returnReserve) : "");

      // Pre-fill allocation inputs
      const allocMap = {};
      (sumData.categoryAllocations || []).forEach((c) => {
        allocMap[c.name] = c.allocatedAmount;
      });
      setAllocationInputs(allocMap);

      if (!expRes.ok) throw new Error("Your expense records could not be loaded. Please retry.");
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(Array.isArray(expData) ? expData : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgetAndExpenses();
  }, [tripId]);

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
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>💳</div>
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
            Select or plan a trip across Sri Lanka to track expenditures, manage category allocations, and monitor your protected return reserve and food budgets.
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

  // Handle Add/Edit Expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }

    if (!summary.categoryAllocations?.some(c => c.id === Number(expenseForm.budgetCategoryId))) { setError("Choose a budget category for this trip."); return; }

    try {
      setError("");
      setSuccessMsg("");

      const isEdit = editingId !== null;
      const url = isEdit ? `${API_URL}/api/Expenses/${editingId}` : `${API_URL}/api/Expenses`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        tripId: Number(tripId),
        budgetCategoryId: Number(expenseForm.budgetCategoryId),
        amount: Number(expenseForm.amount),
        description: expenseForm.description.trim() || "Travel Expense",
        expenseDate: new Date(expenseForm.expenseDate).toISOString(),
        paymentMethod: expenseForm.paymentMethod,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to ${isEdit ? "update" : "record"} expense.`);
      }

      setSuccessMsg(isEdit ? "Expense updated successfully." : "Expense recorded successfully.");
      setShowAddModal(false);
      setEditingId(null);
      setExpenseForm({
        budgetCategoryId: "",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().slice(0, 16),
        paymentMethod: "CASH",
      });

      await loadBudgetAndExpenses();
      if (onExpenseChanged) onExpenseChanged();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to remove this expense transaction?")) return;

    try {
      setError("");
      const res = await fetch(`${API_URL}/api/Expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete expense.");

      setSuccessMsg("Expense removed.");
      await loadBudgetAndExpenses();
      if (onExpenseChanged) onExpenseChanged();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Food Plan
  const handleSaveFoodPlan = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await fetch(`${API_URL}/api/Budgets/trip/${tripId}/food-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodBudget: Number(foodPlanForm.foodBudget) || 0,
          budgetStyle: foodPlanForm.budgetStyle,
        }),
      });
      if (!res.ok) throw new Error("Failed to update food planning.");

      const updated = await res.json();
      setSummary(updated);
      setSuccessMsg("✓ Food budget plan saved.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Accommodation Plan
  const handleSaveAccommodationPlan = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await fetch(`${API_URL}/api/Budgets/trip/${tripId}/accommodation-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accommodationBudget: Number(accommodationForm.accommodationBudget) || 0,
          nightlyRate: accommodationForm.nightlyRate ? Number(accommodationForm.nightlyRate) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update accommodation budget.");

      const updated = await res.json();
      setSummary(updated);
      setSuccessMsg("✓ Accommodation budget updated.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Return Reserve
  const handleSaveReturnReserve = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const res = await fetch(`${API_URL}/api/Budgets/trip/${tripId}/return-reserve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnReserve: Number(returnReserveAmount) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to update return reserve.");

      const updated = await res.json();
      setSummary(updated);
      setSuccessMsg("✓ Protected return reserve updated.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Save Category Allocations
  const handleSaveAllocations = async () => {
    try {
      setError("");
      const categoriesPayload = Object.entries(allocationInputs).map(([name, amount]) => ({
        name,
        allocatedAmount: Number(amount) || 0,
      }));

      const res = await fetch(`${API_URL}/api/Budgets/trip/${tripId}/allocations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: categoriesPayload }),
      });

      if (!res.ok) throw new Error("Failed to update category limits.");

      const updated = await res.json();
      setSummary(updated);
      setShowAllocationModal(false);
      setSuccessMsg("✓ Category allocations updated.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setError(err.message);
    }
  };

  // Auto calculate food budget based on style
  const handleApplyFoodStyle = (style) => {
    const dailyRate = style === "Budget Friendly" ? 2500 : style === "Comfort" ? 8500 : style === "Premium" ? 15000 : 5000;
    const days = summary?.estimatedNights ? summary.estimatedNights + 1 : 4;
    const computedTotal = dailyRate * days;
    setFoodPlanForm({
      foodBudget: String(computedTotal),
      budgetStyle: style,
    });
  };

  if (loading) return <LoadingState label="Loading your budget and expenses…"/>;
  if (!summary) return <ErrorState message={error || "Your budget is not available."} onRetry={loadBudgetAndExpenses}/>;

  // Safe to Spend check
  const totalBudget = summary?.totalBudget ?? 0;
  const totalSpent = summary?.totalSpent ?? 0;
  const remainingFunds = summary?.remainingFunds ?? (totalBudget - totalSpent);
  const returnReserve = summary?.returnReserve ?? 0;
  const remainingFood = summary?.remainingFoodBudget ?? 0;
  const safeToSpend = summary?.safeToSpend ?? (totalBudget - totalSpent - returnReserve - remainingFood);
  const budgetHealth = summary?.budgetHealth ?? "UNAVAILABLE";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span style={{ color: "var(--teal)", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Financial Governance
          </span>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.1rem", fontWeight: 600, color: "var(--ink)", margin: "4px 0 6px" }}>
            Budget & Expenses
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
            Deterministic financial tracking with protected return reserves, food allowances, and category limits.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={loadBudgetAndExpenses}
            disabled={loading}
          >
            ↻ Refresh Balances
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditingId(null);
              setExpenseForm({ budgetCategoryId: summary?.categoryAllocations?.[0]?.id || "", amount: "", description: "", expenseDate: new Date().toISOString().slice(0, 16), paymentMethod: "CASH" });
              setShowAddModal(true);
            }}
          >
            + Record Expense
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ backgroundColor: "var(--danger-bg)", border: "1px solid var(--danger-border)", color: "var(--danger)", padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: "20px", fontSize: "0.9rem" }}>
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div style={{ backgroundColor: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success)", padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: "20px", fontSize: "0.9rem" }}>
          {successMsg}
        </div>
      )}

      {/* ========================================================= */}
      {/* 8 SUMMARY CARDS GRID                                      */}
      {/* ========================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {/* Total Budget */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Total Trip Budget
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--ink)" }}>
            LKR {totalBudget.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Trip budget
          </div>
        </div>

        {/* Total Spent */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Total Spent
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: totalSpent > totalBudget && totalBudget > 0 ? "var(--danger)" : "var(--ink)" }}>
            LKR {totalSpent.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            {summary?.spendingPercentage ?? 0}% of allocated budget
          </div>
        </div>

        {/* Remaining Funds */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Remaining Funds
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: remainingFunds >= 0 ? "var(--success)" : "var(--danger)" }}>
            LKR {remainingFunds.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Total balance in wallet
          </div>
        </div>

        {/* Protected Return Reserve */}
        <div className="tw-card" style={{ margin: 0, padding: "20px", borderLeft: "4px solid var(--teal)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
              Return Reserve
            </span>
            <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>PROTECTED</span>
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--teal)" }}>
            LKR {returnReserve.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Reserved for safe transit home
          </div>
        </div>

        {/* Remaining Food Budget */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Food Remaining
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--ink)" }}>
            LKR {remainingFood.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Spent: LKR {(summary?.foodSpent ?? 0).toLocaleString()} of LKR {(summary?.foodBudget ?? 0).toLocaleString()}
          </div>
        </div>

        {/* Safe To Spend */}
        <div className="tw-card" style={{ margin: 0, padding: "20px", backgroundColor: safeToSpend >= 0 ? "var(--bg-surface)" : "var(--danger-bg)", border: safeToSpend < 0 ? "1px solid var(--danger-border)" : "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Safe To Spend
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: safeToSpend >= 0 ? "var(--teal)" : "var(--danger)" }}>
            LKR {safeToSpend.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Budget − Spent − Return − Food
          </div>
        </div>

        {/* Budget Health */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Budget Health
          </div>
          <div style={{ marginTop: "4px", marginBottom: "6px" }}>
            {budgetHealth === "HEALTHY" && <span className="badge badge-success" style={{ fontSize: "1.1rem", padding: "6px 14px" }}>HEALTHY</span>}
            {budgetHealth === "MODERATE" && <span className="badge badge-info" style={{ fontSize: "1.1rem", padding: "6px 14px" }}>MODERATE</span>}
            {budgetHealth === "WARNING" && <span className="badge badge-warning" style={{ fontSize: "1.1rem", padding: "6px 14px" }}>WARNING</span>}
            {budgetHealth === "OVERSPENT" && <span className="badge badge-danger" style={{ fontSize: "1.1rem", padding: "6px 14px" }}>OVERSPENT</span>}
            {budgetHealth === "UNSET" && <span className="badge" style={{ fontSize: "1.1rem", padding: "6px 14px", backgroundColor: "var(--bg-surface-alt)", color: "var(--text-muted)" }}>UNSET</span>}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            {totalBudget <= 0 ? "Underlying budget unallocated" : "Deterministic evaluation"}
          </div>
        </div>

        {/* Spending Velocity */}
        <div className="tw-card" style={{ margin: 0, padding: "20px" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", marginBottom: "6px" }}>
            Daily Velocity
          </div>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--ink)" }}>
            LKR {Math.round(summary?.spendingVelocityPerDay ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Target: LKR {Math.round(summary?.dailyBudget ?? 0).toLocaleString()} / day
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3 PLANNING & ALLOCATION PANELS: FOOD, ACCOMMODATION, RETURN */}
      {/* ========================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "28px" }}>
        {/* 1. Smart Food Allocation (Requirement 5) */}
        <div className="tw-card" style={{ margin: 0 }}>
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🍛</span> Smart Food Planning
            </h3>
            <span className="badge badge-info">{foodPlanForm.budgetStyle}</span>
          </div>

          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Deterministic meal budgeting tailored to trip duration, traveller count, and comfort style.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "var(--bg-surface-alt)", padding: "12px", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block" }}>Daily Food Allowance</span>
              <strong style={{ fontSize: "1.05rem", color: "var(--ink)" }}>
                LKR {Math.round(summary?.dailyFoodAllowance ?? 0).toLocaleString()} / day
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block" }}>Total Food Reserve</span>
              <strong style={{ fontSize: "1.05rem", color: "var(--ink)" }}>
                LKR {(summary?.foodBudget ?? 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSaveFoodPlan}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
                Select Budget Style:
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                {["Budget Friendly", "Balanced", "Comfort", "Premium"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => handleApplyFoodStyle(style)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${foodPlanForm.budgetStyle === style ? "var(--teal)" : "var(--border-color)"}`,
                      backgroundColor: foodPlanForm.budgetStyle === style ? "var(--teal-light)" : "var(--bg-surface)",
                      color: foodPlanForm.budgetStyle === style ? "var(--teal)" : "var(--text-primary)",
                      fontWeight: foodPlanForm.budgetStyle === style ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="food-budget-input" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
                Total Food Reserve (LKR):
              </label>
              <input
                id="food-budget-input"
                type="number"
                min="0"
                step="500"
                value={foodPlanForm.foodBudget}
                onChange={(e) => setFoodPlanForm({ ...foodPlanForm, foodBudget: e.target.value })}
                placeholder="e.g. 20000"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-outline" style={{ width: "100%", fontSize: "0.85rem" }}>
              Save Food Plan
            </button>
          </form>
        </div>

        {/* 2. Accommodation / Hotel Budget (Requirement 7) */}
        <div className="tw-card" style={{ margin: 0 }}>
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🏨</span> Accommodation Planning
            </h3>
            <span className="badge badge-info">{summary?.estimatedNights ?? 3} Nights</span>
          </div>

          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Allocate lodging funds without fake inventory or fabricated hotel bookings.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "var(--bg-surface-alt)", padding: "12px", borderRadius: "var(--radius-md)", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block" }}>Est. Nightly Rate</span>
              <strong style={{ fontSize: "1.05rem", color: "var(--ink)" }}>
                LKR {Math.round(summary?.nightlyAccommodationRate ?? (summary?.accommodationBudget && summary?.estimatedNights ? summary.accommodationBudget / summary.estimatedNights : 0)).toLocaleString()} / night
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", display: "block" }}>Remaining Acc. Funds</span>
              <strong style={{ fontSize: "1.05rem", color: "var(--success)" }}>
                LKR {(summary?.remainingAccommodationBudget ?? 0).toLocaleString()}
              </strong>
            </div>
          </div>

          <form onSubmit={handleSaveAccommodationPlan}>
            <div style={{ marginBottom: "12px" }}>
              <label htmlFor="acc-total-input" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
                Total Accommodation Budget (LKR):
              </label>
              <input
                id="acc-total-input"
                type="number"
                min="0"
                step="1000"
                value={accommodationForm.accommodationBudget}
                onChange={(e) => {
                  const val = e.target.value;
                  const nights = summary?.estimatedNights || 3;
                  setAccommodationForm({
                    accommodationBudget: val,
                    nightlyRate: val ? String(Math.round(Number(val) / nights)) : "",
                  });
                }}
                placeholder="e.g. 35000"
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="acc-nightly-input" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
                Or Estimated Nightly Rate (LKR):
              </label>
              <input
                id="acc-nightly-input"
                type="number"
                min="0"
                step="500"
                value={accommodationForm.nightlyRate}
                onChange={(e) => {
                  const val = e.target.value;
                  const nights = summary?.estimatedNights || 3;
                  setAccommodationForm({
                    nightlyRate: val,
                    accommodationBudget: val ? String(Math.round(Number(val) * nights)) : "",
                  });
                }}
                placeholder="e.g. 10000"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-outline" style={{ width: "100%", fontSize: "0.85rem" }}>
              Save Accommodation Budget
            </button>
          </form>
        </div>

        {/* 3. Protected Return Reserve */}
        <div className="tw-card" style={{ margin: 0 }}>
          <div className="tw-card-header">
            <h3 className="tw-card-title">
              <span>🔁</span> Return Trip Protection
            </h3>
            <span className="badge badge-success">GUARANTEED</span>
          </div>

          <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
            Protect your return journey money before spending on optional excursions or shopping.
          </p>

          <div style={{ backgroundColor: "var(--teal-light)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--teal-border)", marginBottom: "16px" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--teal)", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
              Return Reserve Rule
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>
              This amount is locked in your calculations and subtracted from Safe To Spend to ensure you can always return safely.
            </p>
          </div>

          <form onSubmit={handleSaveReturnReserve}>
            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="return-reserve-input" style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>
                Return Transit Reserve (LKR):
              </label>
              <input
                id="return-reserve-input"
                type="number"
                min="0"
                step="500"
                value={returnReserveAmount}
                onChange={(e) => setReturnReserveAmount(e.target.value)}
                placeholder="e.g. 15000"
                className="form-input"
              />
            </div>

            <button type="submit" className="btn btn-outline" style={{ width: "100%", fontSize: "0.85rem" }}>
              Update Return Reserve
            </button>
          </form>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CATEGORY ALLOCATION LIMITS TABLE                          */}
      {/* ========================================================= */}
      <div className="tw-card" style={{ marginBottom: "28px" }}>
        <div className="tw-card-header">
          <div>
            <h3 className="tw-card-title">
              <span>📊</span> Category Budget Allocations
            </h3>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Customize and monitor spending limits across transport, food, accommodation, and activities.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: "0.82rem" }}
            onClick={() => setShowAllocationModal(true)}
          >
            ⚙️ Adjust Category Limits
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                <th style={{ padding: "12px 16px" }}>Category</th>
                <th style={{ padding: "12px 16px" }}>Allocated Limit</th>
                <th style={{ padding: "12px 16px" }}>Total Spent</th>
                <th style={{ padding: "12px 16px" }}>Remaining</th>
                <th style={{ padding: "12px 16px" }}>Budget Utilization</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.categoryAllocations || []).map((cat) => {
                const icon = CATEGORY_ICONS[cat.name] || "📦";
                const pct = Number(cat.percentageUsed) || 0;
                const isOver = pct > 100;
                return (
                  <tr key={cat.id || cat.name} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--ink)" }}>
                      <span style={{ marginRight: "8px" }}>{icon}</span>
                      {cat.name}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      LKR {Number(cat.allocatedAmount).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: isOver ? "var(--danger)" : "var(--ink)" }}>
                      LKR {Number(cat.spentAmount).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", color: cat.remainingAmount > 0 ? "var(--success)" : "var(--text-muted)" }}>
                      LKR {Number(cat.remainingAmount).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px 16px", minWidth: "160px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ flex: 1, height: "8px", backgroundColor: "var(--bg-surface-alt)", borderRadius: "4px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              height: "100%",
                              backgroundColor: isOver ? "var(--danger)" : pct >= 80 ? "var(--warning)" : "var(--teal)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isOver ? "var(--danger)" : "var(--text-secondary)", minWidth: "36px" }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EXPENSE TRANSACTIONS HISTORY                              */}
      {/* ========================================================= */}
      <div className="tw-card">
        <div className="tw-card-header">
          <div>
            <h3 className="tw-card-title">
              <span>🧾</span> Expense Transaction Records
            </h3>
            <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              All expenses stored in PostgreSQL, instantly updating trip totals.
            </span>
          </div>
          <span className="badge badge-info">{expenses.length} Entries</span>
        </div>

        {expenses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "0.95rem", margin: "0 0 12px" }}>No expenses recorded for this trip yet.</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditingId(null);
                setShowAddModal(true);
              }}
            >
              + Record Your First Expense
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 16px" }}>Date</th>
                  <th style={{ padding: "12px 16px" }}>Description</th>
                  <th style={{ padding: "12px 16px" }}>Category</th>
                  <th style={{ padding: "12px 16px" }}>Method</th>
                  <th style={{ padding: "12px 16px" }}>Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const catObj = (summary?.categoryAllocations || []).find((c) => c.id === exp.budgetCategoryId);
                  const catName = catObj ? catObj.name : "Expense";
                  const icon = CATEGORY_ICONS[catName] || "📦";

                  return (
                    <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {new Date(exp.expenseDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--ink)" }}>
                        {exp.description}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-primary)" }}>
                          {icon} {catName}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {exp.paymentMethod}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--ink)" }}>
                        LKR {Number(exp.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(exp.id);
                            setExpenseForm({
                              budgetCategoryId: exp.budgetCategoryId,
                              amount: String(exp.amount),
                              description: exp.description,
                              expenseDate: new Date(exp.expenseDate).toISOString().slice(0, 16),
                              paymentMethod: exp.paymentMethod,
                            });
                            setShowAddModal(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--teal)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            marginRight: "12px",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--danger)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT EXPENSE                                 */}
      {/* ========================================================= */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(9, 43, 58, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", color: "var(--ink)", margin: 0 }}>
                {editingId ? "Edit Expense Transaction" : "Record New Expense"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: "4px" }} htmlFor="expense-category">
                  Category
                </label>
                <select id="expense-category"
                  value={expenseForm.budgetCategoryId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, budgetCategoryId: e.target.value })}
                  className="form-select"
                >
                  {(summary?.categoryAllocations || []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {CATEGORY_ICONS[cat.name] || "📦"} {cat.name} (Limit: LKR {Number(cat.allocatedAmount).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: "4px" }} htmlFor="expense-amount-lkr">
                  Amount (LKR)
                </label>
                <input id="expense-amount-lkr"
                  type="number"
                  min="1"
                  step="any"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="e.g. 1000"
                  required
                  className="form-input"
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: "4px" }} htmlFor="expense-description">
                  Description
                </label>
                <input id="expense-description"
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Train ticket to Ella or Tea tasting"
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: "4px" }} htmlFor="expense-date-time">
                    Date & Time
                  </label>
                  <input id="expense-date-time"
                    type="datetime-local"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.84rem", fontWeight: 600, marginBottom: "4px" }} htmlFor="expense-payment-method">
                    Payment Method
                  </label>
                  <select id="expense-payment-method"
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                    className="form-select"
                  >
                    <option value="CASH">💵 Cash</option>
                    <option value="CARD">💳 Card</option>
                    <option value="MOBILE">📱 Mobile / QR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Save Changes" : "Record Expense →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADJUST CATEGORY LIMITS                             */}
      {/* ========================================================= */}
      {showAllocationModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(9, 43, 58, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              padding: "28px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", color: "var(--ink)", margin: 0 }}>
                  Adjust Category Limits
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Set budget caps for each expense classification.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAllocationModal(false)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: "12px", maxHeight: "380px", overflowY: "auto", paddingRight: "4px", marginBottom: "20px" }}>
              {Object.keys(allocationInputs).map((catName) => (
                <div key={catName} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px" }}>
                  <label style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--ink)", minWidth: "140px" }}>
                    {CATEGORY_ICONS[catName] || "📦"} {catName}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>LKR</span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={allocationInputs[catName] || ""}
                      onChange={(e) => setAllocationInputs({ ...allocationInputs, [catName]: e.target.value })}
                      className="form-input"
                      style={{ padding: "8px 10px" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowAllocationModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveAllocations}>
                Save Category Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseManager;
