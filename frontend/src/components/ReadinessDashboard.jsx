import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const API_URL = API_BASE_URL;

function ReadinessDashboard({ tripId = 2 }) {
  const [requirements, setRequirements] = useState([]);
  const [items, setItems] = useState([]);
  const [assessment, setAssessment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState("");

  const [requirementForm, setRequirementForm] = useState({
    name: "",
    description: "",
    isRequired: true,
    deadline: "",
  });

  const [itemForm, setItemForm] = useState({
    travelRequirementId: "",
    status: "PENDING",
    notes: "",
  });

  const [editingItemId, setEditingItemId] = useState(null);

  // --------------------------------------------------
  // READ - Load requirements and readiness items
  // --------------------------------------------------
  const loadReadiness = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/Readiness/trip/${tripId}`
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to load readiness information."
        );
      }

      const data = await response.json();

      /*
        Depending on the backend response object,
        use the available requirement/item collections.
      */

      const loadedRequirements =
        data.requirements ??
        data.travelRequirements ??
        [];

      const loadedItems =
        data.items ??
        data.readinessItems ??
        [];

      setRequirements(loadedRequirements);
      setItems(loadedItems);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadiness();
  }, [tripId]);

  // --------------------------------------------------
  // REQUIREMENT FORM
  // --------------------------------------------------
  const handleRequirementChange = (event) => {
    const { name, value, type, checked } = event.target;

    setRequirementForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // --------------------------------------------------
  // CREATE REQUIREMENT
  // --------------------------------------------------
  const addRequirement = async (event) => {
    event.preventDefault();

    try {
      setError("");

      const newRequirement = {
        tripId: tripId,
        name: requirementForm.name,
        description: requirementForm.description,
        isRequired: requirementForm.isRequired,

        deadline: requirementForm.deadline
          ? new Date(
              requirementForm.deadline
            ).toISOString()
          : null,
      };

      const response = await fetch(
        `${API_URL}/api/Readiness/requirements`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(newRequirement),
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message || "Failed to add travel requirement."
        );
      }

      setRequirementForm({
        name: "",
        description: "",
        isRequired: true,
        deadline: "",
      });

      await loadReadiness();
    } catch (err) {
      setError(err.message);
    }
  };

  // --------------------------------------------------
  // ITEM FORM
  // --------------------------------------------------
  const handleItemChange = (event) => {
    const { name, value } = event.target;

    setItemForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // CREATE OR UPDATE READINESS ITEM
  // --------------------------------------------------
  const saveReadinessItem = async (event) => {
    event.preventDefault();

    try {
      setError("");

      let response;

      // UPDATE
      if (editingItemId !== null) {
        const updateData = {
          status: itemForm.status,
          notes: itemForm.notes,
        };

        response = await fetch(
          `${API_URL}/api/Readiness/items/${editingItemId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(updateData),
          }
        );
      }

      // CREATE
      else {
        const newItem = {
          tripId: tripId,

          travelRequirementId: Number(
            itemForm.travelRequirementId
          ),

          status: itemForm.status,
          notes: itemForm.notes,
        };

        response = await fetch(
          `${API_URL}/api/Readiness/items`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(newItem),
          }
        );
      }

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            (editingItemId !== null
              ? "Failed to update readiness item."
              : "Failed to create readiness item.")
        );
      }

      resetItemForm();

      await loadReadiness();
    } catch (err) {
      setError(err.message);
    }
  };

  // --------------------------------------------------
  // EDIT
  // --------------------------------------------------
  const editItem = (item) => {
    setEditingItemId(item.id);

    setItemForm({
      travelRequirementId:
        item.travelRequirementId ?? "",

      status:
        item.status ?? "PENDING",

      notes:
        item.notes ?? "",
    });
  };

  const resetItemForm = () => {
    setEditingItemId(null);

    setItemForm({
      travelRequirementId: "",
      status: "PENDING",
      notes: "",
    });
  };

  // --------------------------------------------------
  // DETERMINISTIC READINESS ASSESSMENT
  // --------------------------------------------------
  const assessReadiness = async () => {
    try {
      setAssessing(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/Readiness/assess/trip/${tripId}`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const message = await response.text();

        throw new Error(
          message ||
            "Failed to calculate readiness assessment."
        );
      }

      const data = await response.json();

      setAssessment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setAssessing(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <section>
      <h2>Travel Document & Readiness Management</h2>

      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}

      {/* ------------------------------------------ */}
      {/* ADD REQUIREMENT */}
      {/* ------------------------------------------ */}

      <h3>Add Travel Requirement</h3>

      <form onSubmit={addRequirement}>
        <div>
          <label htmlFor="requirementName">
            Requirement Name:{" "}
          </label>

          <input
            id="requirementName"
            type="text"
            name="name"
            value={requirementForm.name}
            onChange={handleRequirementChange}
            required
          />
        </div>

        <div>
          <label htmlFor="requirementDescription">
            Description:{" "}
          </label>

          <input
            id="requirementDescription"
            type="text"
            name="description"
            value={requirementForm.description}
            onChange={handleRequirementChange}
            required
          />
        </div>

        <div>
          <label htmlFor="requirementDeadline">
            Deadline:{" "}
          </label>

          <input
            id="requirementDeadline"
            type="datetime-local"
            name="deadline"
            value={requirementForm.deadline}
            onChange={handleRequirementChange}
          />
        </div>

        <div>
          <label htmlFor="isRequired">
            Required:{" "}
          </label>

          <input
            id="isRequired"
            type="checkbox"
            name="isRequired"
            checked={requirementForm.isRequired}
            onChange={handleRequirementChange}
          />
        </div>

        <button type="submit">
          Add Requirement
        </button>
      </form>

      <hr />

      {/* ------------------------------------------ */}
      {/* REQUIREMENT LIST */}
      {/* ------------------------------------------ */}

      <h3>Travel Requirements</h3>

      {loading ? (
        <p>Loading readiness information...</p>
      ) : requirements.length === 0 ? (
        <p>No travel requirements found.</p>
      ) : (
        <div>
          {requirements.map((requirement) => (
            <div key={requirement.id}>
              <p>
                <strong>
                  {requirement.name}
                </strong>
              </p>

              <p>
                Description:{" "}
                {requirement.description}
              </p>

              <p>
                Required:{" "}
                {requirement.isRequired
                  ? "Yes"
                  : "No"}
              </p>

              <p>
                Deadline:{" "}
                {requirement.deadline
                  ? new Date(
                      requirement.deadline
                    ).toLocaleString()
                  : "No deadline"}
              </p>

              <p>
                Requirement ID:{" "}
                {requirement.id}
              </p>

              <hr />
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------ */}
      {/* READINESS ITEM FORM */}
      {/* ------------------------------------------ */}

      <h3>
        {editingItemId !== null
          ? "Update Readiness Item"
          : "Record Readiness Status"}
      </h3>

      <form onSubmit={saveReadinessItem}>
        {editingItemId === null && (
          <div>
            <label htmlFor="travelRequirementId">
              Requirement:{" "}
            </label>

            <select
              id="travelRequirementId"
              name="travelRequirementId"
              value={itemForm.travelRequirementId}
              onChange={handleItemChange}
              required
            >
              <option value="">
                Select requirement
              </option>

              {requirements.map(
                (requirement) => (
                  <option
                    key={requirement.id}
                    value={requirement.id}
                  >
                    {requirement.name}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="readinessStatus">
            Status:{" "}
          </label>

          <select
            id="readinessStatus"
            name="status"
            value={itemForm.status}
            onChange={handleItemChange}
            required
          >
            <option value="PENDING">
              Pending
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="MISSING">
              Missing
            </option>

            <option value="EXPIRED">
              Expired
            </option>
          </select>
        </div>

        <div>
          <label htmlFor="readinessNotes">
            Notes:{" "}
          </label>

          <input
            id="readinessNotes"
            type="text"
            name="notes"
            value={itemForm.notes}
            onChange={handleItemChange}
          />
        </div>

        <button type="submit">
          {editingItemId !== null
            ? "Update Status"
            : "Save Status"}
        </button>

        {editingItemId !== null && (
          <button
            type="button"
            onClick={resetItemForm}
          >
            Cancel Edit
          </button>
        )}
      </form>

      <hr />

      {/* ------------------------------------------ */}
      {/* READINESS ITEMS */}
      {/* ------------------------------------------ */}

      <h3>Readiness Checklist</h3>

      {items.length === 0 ? (
        <p>No readiness items recorded.</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.id}>
              <p>
                <strong>
                  Requirement ID:
                </strong>{" "}
                {item.travelRequirementId}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {item.status}
              </p>

              <p>
                <strong>Notes:</strong>{" "}
                {item.notes || "No notes"}
              </p>

              <button
                type="button"
                onClick={() =>
                  editItem(item)
                }
              >
                Edit
              </button>

              <hr />
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------ */}
      {/* ASSESSMENT */}
      {/* ------------------------------------------ */}

      <h3>Readiness Assessment</h3>

      <button
        type="button"
        onClick={assessReadiness}
        disabled={assessing}
      >
        {assessing
          ? "Assessing Readiness..."
          : "Assess Trip Readiness"}
      </button>

      {!assessment ? (
        <p>
          No readiness assessment completed yet.
        </p>
      ) : (
        <div>
          <p>
            <strong>
              Readiness Score:
            </strong>{" "}
            {assessment.readinessScore}
          </p>

          <p>
            <strong>
              Readiness Level:
            </strong>{" "}
            {assessment.readinessLevel}
          </p>

          <p>
            <strong>
              Total Requirements:
            </strong>{" "}
            {assessment.totalRequirements}
          </p>

          <p>
            <strong>
              Completed Requirements:
            </strong>{" "}
            {assessment.completedRequirements}
          </p>

          <p>
            <strong>
              Missing Requirements:
            </strong>{" "}
            {assessment.missingRequirements}
          </p>

          <p>
            <strong>Summary:</strong>{" "}
            {assessment.summary}
          </p>
        </div>
      )}
    </section>
  );
}

export default ReadinessDashboard;