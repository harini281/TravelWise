import { useEffect, useRef, useState } from "react";
import { PageHeader, PrimaryButton, SecondaryButton, ErrorState, LoadingState } from "../TravelWiseUI";
import { localToday, searchAccommodations, validateAccommodationSearch } from "../../utils/accommodationService";
import DestinationAutocomplete from "./DestinationAutocomplete";
import PropertyCard from "./PropertyCard";
import "./accommodation.css";

export default function AccommodationSearch() {
  const [form, setForm] = useState({ destination: null, checkIn: "", checkOut: "", adults: 1, children: 0, rooms: 1 });
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(null);
  const resultHeading = useRef(null);
  useEffect(() => () => pending.current?.abort(), []);

  function change(key, value) {
    pending.current?.abort();
    setForm((current) => ({ ...current, [key]: value }));
    setLoading(false); setError(""); setResults(null); setSubmitted(null); setNextOffset(null);
  }

  async function search(offset = 0) {
    const validation = validateAccommodationSearch(form);
    if (validation) { setError(validation); return; }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setError("");
    if (offset === 0) { setResults(null); setNextOffset(null); setSubmitted(null); }
    try {
      const data = await searchAccommodations({ ...form, offset }, controller.signal);
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.properties)) throw new Error("The search response could not be read. Please try again.");
      setResults((previous) => Array.from(new Map([...(offset ? previous || [] : []), ...data.properties]
        .map((property) => [property.providerId, property])).values()));
      setSubmitted(form);
      setNextOffset(data.nextOffset ?? null);
      if (offset === 0) requestAnimationFrame(() => {
        if (!controller.signal.aborted) resultHeading.current?.focus();
      });
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof TypeError
        ? "Accommodation search could not connect. Check your connection and try again." : err.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="tw-stays">
      <PageHeader eyebrow="Find your place" title="Accommodation"
        description="Explore places to stay around your chosen destination, anywhere in the world." />
      <form className="tw-stay-search" noValidate onSubmit={(event) => { event.preventDefault(); search(); }}>
        <DestinationAutocomplete value={form.destination} onChange={(place) => change("destination", place)} />
        <div><label htmlFor="stay-check-in">Check-in</label>
          <input id="stay-check-in" type="date" min={localToday()} value={form.checkIn} required
            onChange={(event) => change("checkIn", event.target.value)} /></div>
        <div><label htmlFor="stay-check-out">Check-out</label>
          <input id="stay-check-out" type="date" min={form.checkIn || localToday()} value={form.checkOut} required
            onChange={(event) => change("checkOut", event.target.value)} /></div>
        <details className="tw-stay-guests">
          <summary>Guests / Rooms<span>{form.adults || 0} adults · {form.children || 0} children · {form.rooms || 0} rooms</span></summary>
          <fieldset><legend>Guests and rooms</legend>
            {["adults", "children", "rooms"].map((key) => <div key={key}>
              <label htmlFor={`stay-${key}`}>{key[0].toUpperCase() + key.slice(1)}</label>
              <input id={`stay-${key}`} type="number" min={key === "children" ? 0 : 1} max={30} step={1}
                value={form[key]} onChange={(event) => change(key, event.target.value === "" ? "" : Number(event.target.value))} />
            </div>)}
          </fieldset>
        </details>
        <PrimaryButton type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</PrimaryButton>
      </form>
      <p className="tw-stay-explanation">Discover properties within 10 km of your selected destination point. Dates and guest counts describe your intended stay; room availability, capacity and live prices are not checked.</p>
      {error && <ErrorState message={error} />}
      {loading && <LoadingState label="Finding accommodation…" />}
      {results !== null && <section aria-label="Accommodation results" aria-busy={loading}>
        <h2 ref={resultHeading} tabIndex={-1}>{results.length ? `Places to stay near ${submitted.destination.displayName}` : "No accommodations found"}</h2>
        {results.length === 0 ? <p>No properties were returned within 10 km. Try another nearby destination. This does not mean rooms are sold out.</p>
          : <><p>{results.length} properties shown · Availability and live pricing not checked</p>
            <div className="tw-stay-results">{results.map((property) => <PropertyCard key={property.providerId} property={property} />)}</div></>}
        {nextOffset !== null && <SecondaryButton disabled={loading} onClick={() => search(nextOffset)}>Load more properties</SecondaryButton>}
      </section>}
      <p className="tw-provider-note">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> ·
        Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
        Coverage and property details vary by location.</p>
    </div>
  );
}
