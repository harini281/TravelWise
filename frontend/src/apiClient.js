import { API_BASE_URL } from "./apiConfig";

// Add authentication only to this application's API, never to image/map providers.
export function apiFetch(input, options = {}) {
  const url = new URL(input, window.location.origin);
  const api = new URL(
    API_BASE_URL || window.location.origin,
    window.location.origin,
  );
  const headers = new Headers(options.headers);
  if (
    url.origin === api.origin &&
    url.pathname.startsWith(`${api.pathname.replace(/\/$/, "")}/api/`)
  ) {
    try {
      const token = JSON.parse(
        sessionStorage.getItem("travelwise_user") || "null",
      )?.token;
      if (token && !headers.has("Authorization"))
        headers.set("Authorization", `Bearer ${token}`);
    } catch {
      /* A missing session is handled by the API's authentication response. */
    }
  }
  return window.fetch(input, { ...options, headers });
}
