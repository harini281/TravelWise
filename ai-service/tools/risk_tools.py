import os
import httpx


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5179")


def assess_trip_risk(trip_id: int) -> dict:
    """
    Requests the deterministic trip risk assessment
    from the TravelWise ASP.NET Core API.
    """

    if trip_id <= 0:
        return {
            "status": "ERROR",
            "message": "Invalid trip ID."
        }

    url = f"{API_BASE_URL}/api/Risk/assess/trip/{trip_id}"

    try:
        response = httpx.post(url, timeout=10.0)

        if response.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "trip_id": trip_id,
                "message": "Trip was not found."
            }

        if response.status_code in (503, 504):
            return {
                "status": "SAFE_FAILURE",
                "trip_id": trip_id,
                "message": response.text
            }

        response.raise_for_status()

        return {
            "status": "SUCCESS",
            "trip_id": trip_id,
            "risk": response.json()
        }

    except httpx.TimeoutException:
        return {
            "status": "SAFE_FAILURE",
            "trip_id": trip_id,
            "message": "Risk API request timed out."
        }

    except httpx.HTTPError as error:
        return {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": f"Risk API request failed: {error}"
        }