import os
import httpx


API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5179")


def get_trip_activities(trip_id: int) -> dict:
    """
    Retrieves activities for a trip through
    the TravelWise ASP.NET Core API.
    """

    if trip_id <= 0:
        return {
            "status": "ERROR",
            "message": "Invalid trip ID."
        }

    url = f"{API_BASE_URL}/api/Activities/trip/{trip_id}"

    try:
        response = httpx.get(url, timeout=10.0)

        if response.status_code == 404:
            return {
                "status": "NOT_FOUND",
                "trip_id": trip_id,
                "message": "Trip was not found."
            }

        response.raise_for_status()

        return {
            "status": "SUCCESS",
            "trip_id": trip_id,
            "activities": response.json()
        }

    except httpx.TimeoutException:
        return {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": "Activity API request timed out."
        }

    except httpx.HTTPError as error:
        return {
            "status": "ERROR",
            "trip_id": trip_id,
            "message": f"Activity API request failed: {error}"
        }