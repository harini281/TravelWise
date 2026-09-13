from state.workflow_state import TravelWiseState


VALID_RISK_LEVELS = {
    "LOW",
    "MODERATE",
    "HIGH",
    "CRITICAL"
}

VALID_READINESS_LEVELS = {
    "READY",
    "PARTIALLY_READY",
    "NOT_READY"
}


def validate_workflow(
    state: TravelWiseState
) -> TravelWiseState:

    results = state.get(
        "agent_results",
        {}
    )

    validation_results = {
        "passed": True,
        "checks": [],
        "requires_approval": True
    }

    # --------------------------------------------------
    # 1. CHECK REQUIRED AGENTS
    # --------------------------------------------------

    requested_agents = state.get(
        "requested_capabilities",
        [
            "budget",
            "activity",
            "risk",
            "readiness"
        ]
    )

    for agent_name in requested_agents:

        result = results.get(agent_name)

        if result is None:
            validation_results["checks"].append({
                "rule": f"{agent_name}_result_exists",
                "passed": False,
                "message": f"{agent_name} result is missing."
            })

            validation_results["passed"] = False
            continue

        status = result.get(
            "status",
            "UNKNOWN"
        )

        if status != "SUCCESS":
            validation_results["checks"].append({
                "rule": f"{agent_name}_success",
                "passed": False,
                "message": (
                    f"{agent_name} did not complete successfully."
                )
            })

            validation_results["passed"] = False

        else:
            validation_results["checks"].append({
                "rule": f"{agent_name}_success",
                "passed": True,
                "message": (
                    f"{agent_name} completed successfully."
                )
            })

    # --------------------------------------------------
    # 2. RISK VALIDATION
    # --------------------------------------------------

    if "risk" in requested_agents:

        risk_result = results.get(
            "risk",
            {}
        )

        risk_analysis = risk_result.get(
            "analysis",
            {}
        )

        risk_level = risk_analysis.get(
            "risk_level"
        )

        risk_score = risk_analysis.get(
            "risk_score"
        )

        if risk_level not in VALID_RISK_LEVELS:
            validation_results["checks"].append({
                "rule": "valid_risk_level",
                "passed": False,
                "message": "Invalid risk level."
            })

            validation_results["passed"] = False

        else:
            validation_results["checks"].append({
                "rule": "valid_risk_level",
                "passed": True,
                "message": (
                    f"Risk level is {risk_level}."
                )
            })

        if (
            risk_score is None
            or not isinstance(
                risk_score,
                (int, float)
            )
            or risk_score < 0
            or risk_score > 100
        ):
            validation_results["checks"].append({
                "rule": "risk_score_range",
                "passed": False,
                "message": (
                    "Risk score must be between 0 and 100."
                )
            })

            validation_results["passed"] = False

        else:
            validation_results["checks"].append({
                "rule": "risk_score_range",
                "passed": True,
                "message": (
                    f"Risk score {risk_score} is valid."
                )
            })

        if risk_level == "CRITICAL":
            validation_results["checks"].append({
                "rule": "critical_risk_review",
                "passed": True,
                "message": (
                    "Critical risk detected. "
                    "Human approval is mandatory."
                )
            })

            validation_results[
                "requires_approval"
            ] = True

    # --------------------------------------------------
    # 3. READINESS VALIDATION
    # --------------------------------------------------

    if "readiness" in requested_agents:

        readiness_result = results.get(
            "readiness",
            {}
        )

        readiness_analysis = readiness_result.get(
            "analysis",
            {}
        )

        readiness_score = readiness_analysis.get(
            "readiness_score"
        )

        readiness_level = readiness_analysis.get(
            "readiness_level"
        )

        if (
            readiness_score is None
            or not isinstance(
                readiness_score,
                (int, float)
            )
            or readiness_score < 0
            or readiness_score > 100
        ):
            validation_results["checks"].append({
                "rule": "readiness_score_range",
                "passed": False,
                "message": (
                    "Readiness score must be between 0 and 100."
                )
            })

            validation_results["passed"] = False

        else:
            validation_results["checks"].append({
                "rule": "readiness_score_range",
                "passed": True,
                "message": (
                    f"Readiness score "
                    f"{readiness_score} is valid."
                )
            })

        if (
            readiness_level
            not in VALID_READINESS_LEVELS
        ):
            validation_results["checks"].append({
                "rule": "valid_readiness_level",
                "passed": False,
                "message": (
                    "Invalid readiness level."
                )
            })

            validation_results["passed"] = False

        else:
            validation_results["checks"].append({
                "rule": "valid_readiness_level",
                "passed": True,
                "message": (
                    f"Readiness level is "
                    f"{readiness_level}."
                )
            })

    # --------------------------------------------------
    # 4. FINAL WORKFLOW STATE
    # --------------------------------------------------

    state["validation_results"] = (
        validation_results
    )

    if validation_results["passed"]:

        state["workflow_status"] = (
            "AWAITING_APPROVAL"
        )

        state["approval_status"] = (
            "PENDING"
        )

    else:

        state["workflow_status"] = (
            "VALIDATION_FAILED"
        )

        state["approval_status"] = (
            "NOT_AVAILABLE"
        )

    return state