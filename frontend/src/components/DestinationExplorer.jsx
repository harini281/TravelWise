import { apiFetch as fetch } from "../apiClient";
import { useRef, useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";
import {
  PageHeader,
  DestinationVisual,
  FormField,
  PrimaryButton,
  SecondaryButton,
  LoadingState,
  ErrorState,
} from "./TravelWiseUI";

export default function DestinationExplorer({ onPlan }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search(event) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Destinations/search?query=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(
          "Search is unavailable. Try again, or enter a destination directly in Trip Planning.",
        );
      const data = await response.json();
      if (!controller.signal.aborted) setResults(data.destinations || []);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <div className="tw-explorer">
      <PageHeader
        eyebrow="Follow your curiosity"
        title="A world of possibility"
        description="Search a city or town. Find your starting point, then make the journey your own."
      />
      <form className="tw-search-form" onSubmit={search}>
        <FormField
          label="Where would you like to go?"
          hint="Search by place name; region and country help distinguish the results."
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={100}
            required
            placeholder="Search a destination"
          />
        </FormField>
        <PrimaryButton type="submit" disabled={loading}>
          Explore destinations
        </PrimaryButton>
      </form>
      {loading && <LoadingState label="Finding places for your journey…" />}
      {error && <ErrorState message={error} />}
      {results?.length === 0 && (
        <div className="tw-state">
          <h2>No destinations found</h2>
          <p>Try a city or town name, or plan with your own destination.</p>
          <SecondaryButton onClick={() => onPlan({ name: query })}>
            Plan this destination
          </SecondaryButton>
        </div>
      )}
      <div className="tw-destination-grid">
        {results?.map((place) => (
          <article className="tw-destination-card" key={place.id}>
            <DestinationVisual query={`${place.name} ${place.country}`}>
              <div className="tw-destination-name">
                <p className="tw-eyebrow">{place.country}</p>
                <h2>{place.name}</h2>
              </div>
            </DestinationVisual>
            <div className="tw-destination-details">
              <p>{[place.region, place.country].filter(Boolean).join(" · ")}</p>
              <PrimaryButton onClick={() => onPlan(place)}>
                Plan a trip here →
              </PrimaryButton>
            </div>
          </article>
        ))}
      </div>
      {!loading && !error && results === null && (
        <div className="tw-search-invitation">
          <span>THE JOURNEY STARTS HERE</span>
          <h2>
            Somewhere familiar.
            <br />
            <em>Somewhere entirely new.</em>
          </h2>
          <p>Your search shapes the possibilities.</p>
        </div>
      )}
      {results && (
        <p className="tw-provider-note">
          Place data:{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{" "}
          /{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
          . Destination photography is illustrative; availability varies.
        </p>
      )}
    </div>
  );
}
