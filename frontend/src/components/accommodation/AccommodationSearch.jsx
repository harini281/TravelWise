import { useEffect, useRef, useState, useMemo } from "react";
import { PageHeader, PrimaryButton, SecondaryButton, ErrorState, LoadingState } from "../TravelWiseUI";
import { localToday, searchAccommodations, validateAccommodationSearch } from "../../utils/accommodationService";
import DestinationAutocomplete from "./DestinationAutocomplete";
import PropertyCard from "./PropertyCard";
import AccommodationMap from "./AccommodationMap";
import PropertyDetails from "./PropertyDetails";
import "./accommodation.css";

const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "hotel", label: "Hotels" },
  { value: "resort", label: "Resorts" },
  { value: "guest_house", label: "Guest Houses" },
  { value: "hostel", label: "Hostels" },
  { value: "apartment", label: "Apartments" },
  { value: "motel", label: "Motels" },
];

export default function AccommodationSearch({ trip = null }) {
  const [form, setForm] = useState({
    destination: null,
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    rooms: 1,
  });

  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [nextOffset, setNextOffset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Map & Card selection / interaction states
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState(null);
  const [activePropertyId, setActivePropertyId] = useState(null);

  // Responsive mobile view switcher: "list" or "map"
  const [mobileView, setMobileView] = useState("list");

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [keywordFilter, setKeywordFilter] = useState("");

  // Search this area custom center
  const [areaSearchCenter, setAreaSearchCenter] = useState(null);

  const pending = useRef(null);
  const resultHeading = useRef(null);
  const cardRefs = useRef(new Map());

  useEffect(() => () => pending.current?.abort(), []);

  function change(key, value) {
    pending.current?.abort();
    setForm((current) => ({ ...current, [key]: value }));
    setLoading(false);
    setError("");
    setResults(null);
    setSubmitted(null);
    setNextOffset(null);
    setSelectedProperty(null);
    setAreaSearchCenter(null);
  }

  async function search(offset = 0, customCenter = null) {
    const validation = validateAccommodationSearch(form);
    if (validation) {
      setError(validation);
      return;
    }

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    setError("");

    if (offset === 0) {
      setSelectedProperty(null);
      setNextOffset(null);
      setSubmitted(form);
    }

    const searchPayload = {
      ...form,
      offset,
      // Filters apply to loaded results; keep pagination consistent when filters change.
    };

    if (customCenter) {
      searchPayload.centerLatitude = customCenter.latitude;
      searchPayload.centerLongitude = customCenter.longitude;
      setAreaSearchCenter(customCenter);
    } else if (offset === 0) {
      setAreaSearchCenter(null);
    }

    try {
      const data = await searchAccommodations(searchPayload, controller.signal);
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.properties)) {
        throw new Error("The search response could not be read. Please try again.");
      }

      setResults((previous) =>
        Array.from(
          new Map(
            [...(offset ? previous || [] : []), ...data.properties].map((p) => [
              p.providerId,
              p,
            ])
          ).values()
        )
      );

      setSubmitted(form);
      setNextOffset(data.nextOffset ?? null);

      if (offset === 0) {
        requestAnimationFrame(() => {
          if (!controller.signal.aborted) resultHeading.current?.focus();
        });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof TypeError
            ? "Accommodation search could not connect. Check your connection and try again."
            : err.message
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  // Filtered & Sorted Properties
  const filteredProperties = useMemo(() => {
    if (!results) return [];

    return results
      .filter((p) => {
        // Property Type filter
        if (typeFilter !== "all") {
          const t = (p.type || "").toLowerCase().replace(' ', '_');
          if (!t.includes(typeFilter)) return false;
        }

        // Distance filter
        if (distanceFilter !== "all") {
          if (!Number.isFinite(p.distanceMeters)) return false;
          const maxDist = Number(distanceFilter);
          if (p.distanceMeters > maxDist) return false;
        }

        // Keyword filter
        if (keywordFilter.trim()) {
          const kw = keywordFilter.toLowerCase();
          const name = (p.name || "").toLowerCase();
          const addr = (p.address || "").toLowerCase();
          if (!name.includes(kw) && !addr.includes(kw)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "distance") {
          const distA = Number.isFinite(a.distanceMeters) ? a.distanceMeters : 999999;
          const distB = Number.isFinite(b.distanceMeters) ? b.distanceMeters : 999999;
          return distA - distB;
        }
        if (sortBy === "name") {
          return (a.name || "").localeCompare(b.name || "");
        }
        return 0;
      });
  }, [results, typeFilter, distanceFilter, sortBy, keywordFilter]);

  function handleSelectPropertyFromMap(property) {
    setActivePropertyId(property.providerId);
    // Scroll card into view
    const el = cardRefs.current.get(property.providerId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleSearchThisArea(centerCoords) {
    search(0, centerCoords);
  }

  function resetFilters() {
    setTypeFilter("all");
    setDistanceFilter("all");
    setSortBy("distance");
    setKeywordFilter("");
  }

  // If a property is selected for full details view, render PropertyDetails
  if (selectedProperty) {
    return (
      <div className="tw-stays">
        <PropertyDetails
          property={selectedProperty}
          searchParams={submitted || form}
          onBack={() => setSelectedProperty(null)}
        />
      </div>
    );
  }

  return (
    <div className="tw-stays">
      <PageHeader
        eyebrow="Find your place"
        title="Accommodation"
        description="Explore places to stay around your chosen destination, anywhere in the world."
      />

      {/* Connected Trip Planning Quick Banner (Requirement 11) */}
      {trip && trip.destination && form.destination?.displayName !== trip.destination && (
        <div className="tw-trip-context-banner">
          <div className="tw-trip-context-info">
            <span className="tw-icon">🧭</span>
            <span>
              Currently planning trip to <strong>{trip.destination}</strong> ({trip.startingPlace} → {trip.destination}).
            </span>
          </div>
          <button
            type="button"
            className="tw-btn-apply-trip"
            onClick={() => {
              if (Number.isFinite(trip.destinationLatitude) && Number.isFinite(trip.destinationLongitude)) {
                setForm((prev) => ({
                  ...prev,
                  destination: {
                    providerId: `trip-${trip.id}`,
                    displayName: trip.destination,
                    latitude: trip.destinationLatitude,
                    longitude: trip.destinationLongitude,
                  },
                  checkIn: trip.startDate ? trip.startDate.slice(0, 10) : prev.checkIn,
                  checkOut: trip.endDate ? trip.endDate.slice(0, 10) : prev.checkOut,
                }));
              }
            }}
          >
            Explore Stays for This Trip
          </button>
        </div>
      )}

      {/* Search Header Form */}
      <form
        className="tw-stay-search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <DestinationAutocomplete
          value={form.destination}
          onChange={(place) => change("destination", place)}
        />

        <div>
          <label htmlFor="stay-check-in">Check-in</label>
          <input
            id="stay-check-in"
            type="date"
            min={localToday()}
            value={form.checkIn}
            required
            onChange={(event) => change("checkIn", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="stay-check-out">Check-out</label>
          <input
            id="stay-check-out"
            type="date"
            min={form.checkIn || localToday()}
            value={form.checkOut}
            required
            onChange={(event) => change("checkOut", event.target.value)}
          />
        </div>

        <details className="tw-stay-guests">
          <summary>
            Guests / Rooms
            <span>
              {form.adults || 0} adults · {form.children || 0} children · {form.rooms || 0} rooms
            </span>
          </summary>
          <fieldset>
            <legend>Guests and rooms</legend>
            {["adults", "children", "rooms"].map((key) => (
              <div key={key}>
                <label htmlFor={`stay-${key}`}>
                  {key[0].toUpperCase() + key.slice(1)}
                </label>
                <input
                  id={`stay-${key}`}
                  type="number"
                  min={key === "children" ? 0 : 1}
                  max={30}
                  step={1}
                  value={form[key]}
                  onChange={(event) =>
                    change(
                      key,
                      event.target.value === "" ? "" : Number(event.target.value)
                    )
                  }
                />
              </div>
            ))}
          </fieldset>
        </details>

        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </PrimaryButton>
      </form>

      <p className="tw-stay-explanation">
        Discover properties within 10 km of your selected destination point. Dates and guest counts describe your intended stay; room availability, capacity and live prices are not checked.
      </p>

      {error && <ErrorState message={error} />}
      {loading && <LoadingState label="Finding accommodation…" />}

      {/* Results Section */}
      {results !== null && (
        <section
          aria-label="Accommodation results"
          aria-busy={loading}
          className="tw-results-section"
        >
          <div className="tw-results-header-row">
            <div>
              <h2 ref={resultHeading} tabIndex={-1}>
                {results.length
                  ? `Places to stay near ${submitted.destination.displayName}`
                  : "No accommodations found"}
              </h2>
              {results.length > 0 && (
                <p className="tw-results-subtitle">
                  Showing {filteredProperties.length} of {results.length} properties · Availability and live pricing not checked
                </p>
              )}
            </div>

            {/* Mobile View Switcher (List vs Map) */}
            <div className="tw-mobile-view-toggle">
              <button
                type="button"
                className={`tw-toggle-btn ${mobileView === "list" ? "active" : ""}`}
                onClick={() => setMobileView("list")}
              >
                📋 List
              </button>
              <button
                type="button"
                className={`tw-toggle-btn ${mobileView === "map" ? "active" : ""}`}
                onClick={() => setMobileView("map")}
              >
                🗺️ Map
              </button>
            </div>
          </div>

          {results.length === 0 && (
            <p className="tw-no-results-msg">
              No properties were returned within 10 km. Try another nearby destination. This does not mean rooms are sold out.
            </p>
          )}
          {(
            <div className="tw-stays-layout">
              {/* LEFT COLUMN: Useful Filters */}
              <aside className={`tw-stays-filters-column ${mobileView === "map" ? "tw-mobile-hidden" : ""}`}>
                <div className="tw-filters-card">
                  <div className="tw-filters-title-row">
                    <h3>Filter Results</h3>
                    <button
                      type="button"
                      className="tw-btn-reset-filters"
                      onClick={resetFilters}
                    >
                      Reset
                    </button>
                  </div>

                  <p className="tw-stay-notice">Filters apply to loaded properties. Distances are from the current search centre.</p>
                  {/* Keyword Filter */}
                  <div className="tw-filter-group">
                    <label htmlFor="filter-keyword">Search by name or address</label>
                    <input
                      id="filter-keyword"
                      type="text"
                      placeholder="e.g. Grand, Beach..."
                      value={keywordFilter}
                      onChange={(e) => setKeywordFilter(e.target.value)}
                    />
                  </div>

                  {/* Property Type Filter */}
                  <div className="tw-filter-group">
                    <span className="tw-filter-label">Property Category</span>
                    <div className="tw-filter-chips">
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          className={`tw-chip-btn ${typeFilter === t.value ? "active" : ""}`}
                          onClick={() => setTypeFilter(t.value)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Distance Filter */}
                  <div className="tw-filter-group">
                    <span className="tw-filter-label">Maximum Distance</span>
                    <div className="tw-filter-chips">
                      {[
                        { value: "all", label: "Any (10 km)" },
                        { value: "2000", label: "Within 2 km" },
                        { value: "5000", label: "Within 5 km" },
                      ].map((d) => (
                        <button
                          key={d.value}
                          type="button"
                          className={`tw-chip-btn ${distanceFilter === d.value ? "active" : ""}`}
                          onClick={() => setDistanceFilter(d.value)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div className="tw-filter-group">
                    <span className="tw-filter-label">Sort Results</span>
                    <div className="tw-filter-chips">
                      {[
                        { value: "distance", label: "Nearest First" },
                        { value: "name", label: "Name (A–Z)" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          className={`tw-chip-btn ${sortBy === s.value ? "active" : ""}`}
                          onClick={() => setSortBy(s.value)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              {/* CENTER COLUMN: Professional Property Cards */}
              <div className={`tw-stays-results-column ${mobileView === "map" ? "tw-mobile-hidden" : ""}`}>
                {filteredProperties.length === 0 ? (
                  <div className="tw-no-filtered-results">
                    <p>No accommodations match your active filters.</p>
                    <button
                      type="button"
                      className="tw-btn-reset-filters"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <div className="tw-stay-results-grid">
                    {filteredProperties.map((property) => (
                      <div
                        key={property.providerId}
                        ref={(el) => {
                          if (el) cardRefs.current.set(property.providerId, el);
                          else cardRefs.current.delete(property.providerId);
                        }}
                      >
                        <PropertyCard
                          property={property}
                          isSelected={activePropertyId === property.providerId}
                          isHovered={hoveredPropertyId === property.providerId}
                          onSelect={() => setActivePropertyId(property.providerId)}
                          onViewDetails={(prop) => setSelectedProperty(prop)}
                          onMouseEnter={() => setHoveredPropertyId(property.providerId)}
                          onMouseLeave={() => setHoveredPropertyId(null)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {nextOffset !== null && (
                  <div className="tw-load-more-row">
                    <SecondaryButton
                      disabled={loading}
                      onClick={() => search(nextOffset, areaSearchCenter)}
                    >
                      Load more properties
                    </SecondaryButton>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Interactive Leaflet Map */}
              <div className={`tw-stays-map-column ${mobileView === "list" ? "tw-mobile-hidden" : ""}`}>
                <div className="tw-sticky-map-box">
                  <AccommodationMap
                    properties={filteredProperties}
                    selectedProperty={filteredProperties.find((p) => p.providerId === activePropertyId)}
                    hoveredPropertyId={hoveredPropertyId}
                    onHoverProperty={setHoveredPropertyId}
                    destination={submitted?.destination}
                    searchCenter={areaSearchCenter || submitted?.destination}
                    onSelectProperty={handleSelectPropertyFromMap}
                    onSearchArea={handleSearchThisArea}
                    height="100%"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <p className="tw-provider-note">
        Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> ·
        Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
        Coverage and property details vary by location.
      </p>
    </div>
  );
}
