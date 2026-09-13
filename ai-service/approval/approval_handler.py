from state.workflow_state import TravelWiseState


VALID_DECISIONS = {
    "APPROVE",
    "REJECT",
    "REVISE"
}


def process_approval(
    state: TravelWiseState,
    decision: str,
    reviewer: str = "authorized_reviewer",
    comment: str = ""
) -> TravelWiseState:

    decision = decision.strip().upper()

    # Approval is only allowed after successful validation.
    if state.get("workflow_status") != "AWAITING_APPROVAL":
        state["approval_status"] = "NOT_AVAILABLE"

        state["errors"] = state.get("errors", [])
        state["errors"].append(
            "Approval cannot be processed because "
            "the workflow is not awaiting approval."
        )

        return state

    if decision not in VALID_DECISIONS:
        state["approval_status"] = "INVALID_DECISION"

        state["errors"] = state.get("errors", [])
        state["errors"].append(
            "Approval decision must be "
            "APPROVE, REJECT, or REVISE."
        )

        return state

    state["approval_decision"] = {
        "decision": decision,
        "reviewer": reviewer,
        "comment": comment
    }

    if decision == "APPROVE":
        state["approval_status"] = "APPROVED"
        state["workflow_status"] = "COMPLETED"

    elif decision == "REJECT":
        state["approval_status"] = "REJECTED"
        state["workflow_status"] = "REJECTED"

    elif decision == "REVISE":
        state["approval_status"] = "REVISION_REQUIRED"
        state["workflow_status"] = "REVISION_REQUIRED"

    return state