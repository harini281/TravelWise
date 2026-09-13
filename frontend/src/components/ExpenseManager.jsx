import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

const CATEGORY_MAP = {
  1: "Transport",
  2: "Food & Dining",
  3: "Activities & Tours",
  4: "Accommodation",
  5: "Miscellaneous",
};

function ExpenseManager({ tripId = 2, onExpenseChanged }) {
  const [expenses, setExpenses] = useState([]);
  const [budgetHealth, setBudgetHealth] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);

  const [form, setForm] = useState({
    budgetCategoryId: 1,
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 16),
    paymentMethod: "CASH",
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const [expRes, bgtRes] = await Promise.all([
        fetch(`${API_URL}/api/Expenses/trip/${tripId}`),
        fetch(`${API_URL}/api/Budgets/${tripId}/health`),
      ]);

      if (!expRes.ok) throw new Error("Failed to load expenses.");
      const expData = await expRes.json();
      setExpenses(expData);

      if (bgtRes.ok) {
        const bgtData = await bgtRes.json();
        setBudgetHealth(bgtData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [tripId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      budgetCategoryId: 1,
      amount: "",
      description: "",
      expenseDate: new Date().toISOString().slice(0, 16),
      paymentMethod: "CASH",
    });
    setEditingId(null);
    setShowFormModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      if (!form.expenseDate) {
        throw new Error("Please select an expense date.");
      }

      if (editingId !== null) {
        const updatedExpense = {
          amount: Number(form.amount),
          description: form.description,
          expenseDate: new Date(form.expenseDate).toISOString(),
          paymentMethod: form.paymentMethod,
        };

        const response = await fetch(`${API_URL}/api/Expenses/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedExpense),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to update expense.");
        }
      } else {
        const newExpense = {
          tripId: tripId,
          budgetCategoryId: Number(form.budgetCategoryId),
          amount: Number(form.amount),
          description: form.description,
          expenseDate: new Date(form.expenseDate).toISOString(),
          paymentMethod: form.paymentMethod,
        };

        const response = await fetch(`${API_URL}/api/Expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newExpense),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to add expense.");
        }
      }

      resetForm();
      await loadExpenses();

      if (onExpenseChanged) onExpenseChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      budgetCategoryId: expense.budgetCategoryId ?? 1,
      amount: expense.amount ?? "",
      description: expense.description ?? "",
      expenseDate: expense.expenseDate ? expense.expenseDate.slice(0, 16) : "",
      paymentMethod: expense.paymentMethod || "CASH",
    });
    setShowFormModal(true);
  };

  const handleDelete = async (expenseId) => {
    const confirmed = window.confirm("Are you sure you want to delete this expense?");
    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(`${API_URL}/api/Expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to delete expense.");
      }

      if (editingId === expenseId) resetForm();

      await loadExpenses();
      if (onExpenseChanged) onExpenseChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalBudget = budgetHealth?.totalBudget ?? 80000;
  const totalSpent = budgetHealth?.totalSpent ?? 0;
  const remainingBudget = budgetHealth?.remainingBudget ?? (totalBudget - totalSpent);
  const spendPct = budgetHealth?.spendingPercentage ?? (totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0);
  const budgetHealthStatus = budgetHealth?.budgetHealth ?? "HEALTHY";

  const getHealthBadge = (health) => {
    switch (health) {
      case "HEALTHY":
        return <span className="badge badge-success">HEALTHY</span>;
      case "WARNING":
        return <span className="badge badge-warning">WARNING</span>;
      case "CRITICAL":
        return <span className="badge badge-danger">CRITICAL</span>;
      default:
        return <span className="badge badge-info">{health}</span>;
    }
  };

  return (
    <section>
      <div className="tw-card-header" style={{ marginBottom: "20px" }}>
        <div>
          <h2 className="page-title">Budget & Expenses</h2>
          <p className="body-text">
            Track category spending, remaining funds, and financial velocity for your journey.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowFormModal(true);
          }}
        >
          + Add Expense
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

      {/* 4 Summary KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Budget</span>
            <span>🎯</span>
          </div>
          <div className="kpi-value">
            LKR {totalBudget.toLocaleString()}
          </div>
          <span className="kpi-subtext">Allocated trip pool</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Spent</span>
            <span>💸</span>
          </div>
          <div className="kpi-value">
            LKR {totalSpent.toLocaleString()}
          </div>
          <span className="kpi-subtext">{spendPct}% of allocated budget</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Remaining Funds</span>
            <span>💼</span>
          </div>
          <div className="kpi-value" style={{ color: remainingBudget < 0 ? "var(--danger)" : "inherit" }}>
            LKR {remainingBudget.toLocaleString()}
          </div>
          <span className="kpi-subtext">Available for remaining days</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Budget Health</span>
            <span>🩺</span>
          </div>
          <div style={{ margin: "12px 0 6px" }}>
            {getHealthBadge(budgetHealthStatus)}
          </div>
          <span className="kpi-subtext">
            {budgetHealthStatus === "HEALTHY"
              ? "Spending is within planned thresholds"
              : budgetHealthStatus === "WARNING"
              ? "Approaching warning allocation limit"
              : "Excess spending detected; review upcoming costs"}
          </span>
        </div>
      </div>

      {/* Spending Progress Bar Card */}
      <div className="tw-card" style={{ padding: "18px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.88rem" }}>
          <span>
            <strong>Spending Velocity:</strong> LKR {totalSpent.toLocaleString()} of LKR {totalBudget.toLocaleString()}
          </span>
          <strong>{spendPct}% Used</strong>
        </div>
        <div className="progress-bar-container" style={{ height: "10px" }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(spendPct, 100)}%`,
              backgroundColor: spendPct > 90 ? "var(--danger)" : spendPct > 70 ? "var(--warning)" : "var(--success)",
            }}
          />
        </div>
      </div>

      {/* Expense History Table Card */}
      <div className="tw-card">
        <div className="tw-card-header">
          <h3 className="tw-card-title">
            <span>📋</span> Transaction History
          </h3>
          <span className="badge badge-info">{expenses.length} Records</span>
        </div>

        {loading ? (
          <p style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)" }}>
            Loading expenses...
          </p>
        ) : expenses.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>💳</div>
            <h4 style={{ margin: "0 0 6px", color: "var(--text-primary)" }}>No expenses recorded yet</h4>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "16px" }}>
              Keep your travel finances on track by logging costs as you go.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                resetForm();
                setShowFormModal(true);
              }}
            >
              Log First Expense
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="tw-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Date & Time</th>
                  <th>Payment Method</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong style={{ color: "var(--text-primary)" }}>{expense.description}</strong>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
                        {CATEGORY_MAP[expense.budgetCategoryId] || `Category #${expense.budgetCategoryId}`}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.84rem" }}>
                      {expense.expenseDate ? new Date(expense.expenseDate).toLocaleString() : "—"}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        {expense.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "700", color: "var(--text-primary)" }}>
                      LKR {Number(expense.amount).toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => handleEdit(expense)}
                          title="Edit expense"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={() => handleDelete(expense.id)}
                          title="Delete expense"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {showFormModal && (
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
              maxWidth: "480px",
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
              {editingId !== null ? "Edit Expense" : "Record New Expense"}
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "20px" }}>
              {editingId !== null ? "Update details for this logged transaction." : "Add a transaction against your trip budget pool."}
            </p>

            <form onSubmit={handleSubmit}>
              {editingId === null && (
                <div className="form-group">
                  <label className="form-label" htmlFor="expense-category">
                    Category
                  </label>
                  <select
                    id="expense-category"
                    name="budgetCategoryId"
                    className="form-select"
                    value={form.budgetCategoryId}
                    onChange={handleChange}
                    required
                  >
                    <option value="1">Transport</option>
                    <option value="2">Food & Dining</option>
                    <option value="3">Activities & Tours</option>
                    <option value="4">Accommodation</option>
                    <option value="5">Miscellaneous</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="expense-amount">
                  Amount (LKR)
                </label>
                <input
                  id="expense-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-input"
                  placeholder="e.g. 3500"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expense-desc">
                  Description
                </label>
                <input
                  id="expense-desc"
                  name="description"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ella Rock guide fee"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expense-date">
                  Expense Date & Time
                </label>
                <input
                  id="expense-date"
                  name="expenseDate"
                  type="datetime-local"
                  className="form-input"
                  value={form.expenseDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="expense-payment">
                  Payment Method
                </label>
                <select
                  id="expense-payment"
                  name="paymentMethod"
                  className="form-select"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  required
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingId !== null ? "Save Changes" : "Record Expense"}
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

export default ExpenseManager;
