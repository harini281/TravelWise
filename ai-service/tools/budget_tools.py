import httpx


API_BASE_URL = "http://localhost:5179"


def get_trip_budget(trip_id: int) -> dict:
    """
    Retrieves budget details for a trip through
    the TravelWise ASP.NET Core API.
    """

    if trip_id <= 0:
        return {
            "status": "ERROR",
            "message": "Invalid trip ID."
        }

    url = f"{API_BASE_URL}/api/Budgets/{trip_id}/details"

    try:
        response = httpx.get(url, timeout=10.0)

        if response.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "trip_id": trip_id,
                "message": "Budget was not found."
            }

        response.raise_for_status()

        return {
            "status": "SUCCESS",
            "trip_id": trip_id,
            "budget": response.json()
        }

    except httpx.TimeoutException:
        return {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Budget API request timed out."
        }

    except httpx.HTTPError as error:
        return {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": f"Budget API request failed: {error}"
        }


def get_budget_health(budget_id: int) -> dict:
    """
    Retrieves deterministic budget-health information
    from the TravelWise ASP.NET Core API.
    """

    if budget_id <= 0:
        return {
            "status": "ERROR",
            "message": "Invalid budget ID."
        }

    url = f"{API_BASE_URL}/api/Budgets/{budget_id}/health"

    try:
        response = httpx.get(url, timeout=10.0)

        if response.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "budget_id": budget_id,
                "message": "Budget was not found."
            }

        response.raise_for_status()

        return {
            "status": "SUCCESS",
            "budget_id": budget_id,
            "health": response.json()
        }

    except httpx.TimeoutException:
        return {
            "status": "ERROR",
            "budget_id": budget_id,
            "message": "Budget health API request timed out."
        }

    except httpx.HTTPError as error:
        return {
            "status": "ERROR",
            "budget_id": budget_id,
            "message": f"Budget health API request failed: {error}"
        }