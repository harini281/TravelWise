import { apiFetch } from "../apiClient";
import { API_BASE_URL } from "../apiConfig";

async function request(path, options) {
  const response = await apiFetch(`${API_BASE_URL}/api/Accommodations/${path}`, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const validation = data?.errors && Object.values(data.errors).flat().join(" ");
    throw new Error(data?.message || validation || (response.status === 429
      ? "Search is busy. Please try again in a moment."
      : response.status === 401 ? "Please sign in again to search accommodations."
      : "Accommodation search is unavailable. Please try again."));
  }
  if (!data) throw new Error("The search response could not be read. Please try again.");
  return data;
}

export function autocompleteDestinations(query, signal) {
  return request(`destinations?query=${encodeURIComponent(query.trim())}`, { signal });
}

export function searchAccommodations(search, signal) {
  return request("search", {
    method: "POST", signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...search, clientUtcOffsetMinutes: new Date().getTimezoneOffset() }),
  });
}

export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validateAccommodationSearch({ destination, checkIn, checkOut, adults, children, rooms }) {
  if (!destination?.providerId || !destination.displayName || !Number.isFinite(destination.latitude)
    || !Number.isFinite(destination.longitude)) return "Select a destination from the suggestions.";
  if (!checkIn || checkIn < localToday()) return "Check-in must be today or later.";
  if (!checkOut || checkOut <= checkIn) return "Check-out must be after check-in.";
  if (!Number.isInteger(adults) || adults < 1 || adults > 30) return "Adults must be between 1 and 30.";
  if (!Number.isInteger(children) || children < 0 || children > 30) return "Children must be between 0 and 30.";
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 30) return "Rooms must be between 1 and 30.";
  return "";
}
