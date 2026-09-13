import { useEffect, useState } from "react";

const API_URL = "http://localhost:5179";

function WorkflowDashboard({ tripId = 2 }) {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [reviewer, setReviewer] = useState("");
  const [comment, setComment] = useState("");

  // --------------------------------------------------
  // READ WORKFLOW
  // --------------------------------------------------
  const loadWorkflow = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/Workflow/trip/${tripId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setWorkflow(null);
          return;
        }

        const text = await response.text();

        throw new Error(
          text || "Failed to load workflow."
        );
      }

      const data = await response.json();

      // The endpoint may return one workflow
      // or a collection of workflows.
      if (Array.isArray(data)) {
        if (data.length === 0) {
          setWorkflow(null);
        } else {
          // Use latest workflow
          setWorkflow(data[data.length - 1]);
        }
      } else {
        setWorkflow(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflow();
  }, [tripId]);

  // --------------------------------------------------
  // CREATE WORKFLOW
  // --------------------------------------------------
  const createWorkflow = async () => {
    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/Workflow`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tripId: tripId,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text || "Failed to create workflow."
        );
      }

      const data = await response.json();

      setWorkflow(data);

      setMessage(
        "Workflow created successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // APPROVE / REJECT / REVISION
  // --------------------------------------------------
  const submitDecision = async (decision) => {
    if (!workflow) {
      return;
    }

    if (!reviewer.trim()) {
      setError(
        "Please enter the reviewer name."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/Workflow/${workflow.id}/approval`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            decision: decision,
            reviewer: reviewer.trim(),
            comment: comment.trim(),
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();

        throw new Error(
          text || "Failed to process approval."
        );
      }

      const data = await response.json();

      setWorkflow(data);

      setMessage(
        `Workflow decision submitted: ${decision}`
      );

      setComment("");
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <section>
      <h2>AI Workflow & Human Approval</h2>

      {error && (
        <p>
          <strong>Error:</strong> {error}
        </p>
      )}

      {message && (
        <p>
          <strong>{message}</strong>
        </p>
      )}

      {loading ? (
        <p>Loading workflow...</p>
      ) : !workflow ? (
        <div>
          <p>
            No workflow exists for this trip.
          </p>

          <button
            type="button"
            onClick={createWorkflow}
            disabled={processing}
          >
            {processing
              ? "Creating Workflow..."
              : "Create Workflow"}
          </button>
        </div>
      ) : (
        <div>
          <h3>Workflow Information</h3>

          <p>
            <strong>Workflow ID:</strong>{" "}
            {workflow.id}
          </p>

          <p>
            <strong>Trip ID:</strong>{" "}
            {workflow.tripId}
          </p>

          <p>
            <strong>Workflow Status:</strong>{" "}
            {workflow.status}
          </p>

          <p>
            <strong>
              Validation Passed:
            </strong>{" "}
            {workflow.validationPassed
              ? "Yes"
              : "No"}
          </p>

          <p>
            <strong>
              Approval Status:
            </strong>{" "}
            {workflow.approvalStatus}
          </p>

          <p>
            <strong>Reviewer:</strong>{" "}
            {workflow.reviewer ||
              "Not reviewed"}
          </p>

          <p>
            <strong>
              Approval Comment:
            </strong>{" "}
            {workflow.approvalComment ||
              "No comment"}
          </p>

          {workflow.createdAt && (
            <p>
              <strong>Created:</strong>{" "}
              {new Date(
                workflow.createdAt
              ).toLocaleString()}
            </p>
          )}

          {workflow.updatedAt && (
            <p>
              <strong>Last Updated:</strong>{" "}
              {new Date(
                workflow.updatedAt
              ).toLocaleString()}
            </p>
          )}

          <hr />

          <h3>Human Review</h3>

          <div>
            <label htmlFor="reviewer">
              Reviewer:{" "}
            </label>

            <input
              id="reviewer"
              type="text"
              value={reviewer}
              onChange={(event) =>
                setReviewer(event.target.value)
              }
              placeholder="Enter reviewer name"
            />
          </div>

          <div>
            <label htmlFor="approvalComment">
              Comment:{" "}
            </label>

            <input
              id="approvalComment"
              type="text"
              value={comment}
              onChange={(event) =>
                setComment(event.target.value)
              }
              placeholder="Enter review comment"
            />
          </div>

          <br />

          <button
            type="button"
            disabled={processing}
            onClick={() =>
              submitDecision("APPROVE")
            }
          >
            Approve
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={() =>
              submitDecision("REJECT")
            }
          >
            Reject
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={() =>
              submitDecision(
                "REQUEST_REVISION"
              )
            }
          >
            Request Revision
          </button>

          <button
            type="button"
            disabled={processing}
            onClick={loadWorkflow}
          >
            Refresh Workflow
          </button>
        </div>
      )}
    </section>
  );
}

export default WorkflowDashboard;