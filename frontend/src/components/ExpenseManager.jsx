import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function ExpenseManager({
  tripId = 2,
  onExpenseChanged,
}) {
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    budgetCategoryId: 1,
    amount: "",
    description: "",
    expenseDate: "",
    paymentMethod: "CASH",
  });

  // READ - Load expenses for the selected trip
  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/Expenses/trip/${tripId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load expenses.");
      }

      const data = await response.json();

      setExpenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [tripId]);

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Reset form after create/update/cancel
  const resetForm = () => {
    setForm({
      budgetCategoryId: 1,
      amount: "",
      description: "",
      expenseDate: "",
      paymentMethod: "CASH",
    });

    setEditingId(null);
  };

  // CREATE or UPDATE expense
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError("");

      if (!form.expenseDate) {
        throw new Error("Please select an expense date.");
      }

      // UPDATE
      if (editingId !== null) {
        const updatedExpense = {
          amount: Number(form.amount),
          description: form.description,
          expenseDate: new Date(
            form.expenseDate
          ).toISOString(),
          paymentMethod: form.paymentMethod,
        };

        const response = await fetch(
          `${API_URL}/api/Expenses/${editingId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedExpense),
          }
        );

        if (!response.ok) {
          const message = await response.text();

          throw new Error(
            message || "Failed to update expense."
          );
        }
      }

      // CREATE
      else {
        const newExpense = {
          tripId: tripId,
          budgetCategoryId: Number(
            form.budgetCategoryId
          ),
          amount: Number(form.amount),
          description: form.description,
          expenseDate: new Date(
            form.expenseDate
          ).toISOString(),
          paymentMethod: form.paymentMethod,
        };

        const response = await fetch(
          `${API_URL}/api/Expenses`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newExpense),
          }
        );

        if (!response.ok) {
          const message = await response.text();

          throw new Error(
            message || "Failed to add expense."
          );
        }
      }

      resetForm();

      await loadExpenses();

      // Tell BudgetDashboard to refresh
      if (onExpenseChanged) {
        onExpenseChanged();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // EDIT - load existing values into the form
  const handleEdit = (expense) => {
    setEditingId(expense.id);

    setForm({
      budgetCategoryId:
        expense.budgetCategoryId ?? 1,

      amount:
        expense.amount ?? "",

      description:
        expense.description ?? "",

      expenseDate:
        expense.expenseDate
          ? expense.expenseDate.slice(0, 16)
          : "",

      paymentMethod:
        expense.paymentMethod || "CASH",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // DELETE expense
  const handleDelete = async (expenseId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/api/Expenses/${expenseId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to delete expense."
        );
      }

      if (editingId === expenseId) {
        resetForm();
      }

      await loadExpenses();

      if (onExpenseChanged) {
        onExpenseChanged();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section>
      <h2>Trip Expenses</h2>

      {/* CREATE / UPDATE FORM */}
      <form onSubmit={handleSubmit}>
        {/* Category cannot be changed during update
            because UpdateExpenseDto does not contain category */}
        {editingId === null && (
          <div>
            <label htmlFor="budgetCategoryId">
              Category ID:{" "}
            </label>

            <input
              id="budgetCategoryId"
              type="number"
              name="budgetCategoryId"
              value={form.budgetCategoryId}
              onChange={handleChange}
              min="1"
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="amount">
            Amount (LKR):{" "}
          </label>

          <input
            id="amount"
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div>
          <label htmlFor="description">
            Description:{" "}
          </label>

          <input
            id="description"
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="expenseDate">
            Expense Date:{" "}
          </label>

          <input
            id="expenseDate"
            type="datetime-local"
            name="expenseDate"
            value={form.expenseDate}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="paymentMethod">
            Payment Method:{" "}
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            required
          >
            <option value="CASH">
              Cash
            </option>

            <option value="CARD">
              Card
            </option>

            <option value="BANK_TRANSFER">
              Bank Transfer
            </option>
          </select>
        </div>

        <button type="submit">
          {editingId !== null
            ? "Update Expense"
            : "Add Expense"}
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

      {/* ERROR MESSAGE */}
      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}

      <hr />

      <h3>Expense History</h3>

      {/* LOADING */}
      {loading ? (
        <p>Loading expenses...</p>
      ) : expenses.length === 0 ? (
        <p>No expenses recorded yet.</p>
      ) : (
        <div>
          {expenses.map((expense) => (
            <div key={expense.id}>
              <p>
                <strong>
                  {expense.description}
                </strong>
              </p>

              <p>
                <strong>Amount:</strong>{" "}
                LKR {expense.amount}
              </p>

              <p>
                <strong>Category ID:</strong>{" "}
                {expense.budgetCategoryId}
              </p>

              <p>
                <strong>Payment:</strong>{" "}
                {expense.paymentMethod}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {expense.expenseDate
                  ? new Date(
                      expense.expenseDate
                    ).toLocaleString()
                  : "No date"}
              </p>

              <button
                type="button"
                onClick={() =>
                  handleEdit(expense)
                }
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDelete(expense.id)
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

export default ExpenseManager;