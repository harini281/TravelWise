import { useEffect, useMemo, useRef, useState } from "react";
import { SecondaryButton, LoadingState, ErrorState } from "../TravelWiseUI";
import { getNearbyPlaces, getPropertyDetails, safeProviderUrl } from "../../utils/accommodationService";
import AccommodationMap from "./AccommodationMap";
import { PropertyPhoto } from "./PropertyCard";

const NEARBY_CATEGORIES = [
  { key: "restaurants", label: "Restaurants", icon: "🍽️" },
  { key: "cafes", label: "Cafés", icon: "☕" },
  { key: "attractions", label: "Attractions", icon: "🏛️" },
  { key: "transport", label: "Public Transport", icon: "🚆" },
  { key: "healthcare", label: "Healthcare", icon: "🏥" },
  { key: "shopping", label: "Shopping", icon: "🛍️" },
];

export default function PropertyDetails({
  property,
  searchParams,
  onBack,
}) {
  const [details, setDetails] = useState(property);
  const [detailsError, setDetailsError] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeCategory, setActiveCategory] = useState("restaurants");
  const [nearbyPois, setNearbyPois] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [selectedPoi, setSelectedPoi] = useState(null);

  const pendingNearby = useRef(null);
  const pendingDetails = useRef(null);

  // Fetch full details if providerId is available
  useEffect(() => {
    if (!property?.providerId) return;
    const controller = new AbortController();
    pendingDetails.current = controller;
    setLoadingDetails(true);

    getPropertyDetails(property.providerId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && data) {
          setDetails((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(err => { if (!controller.signal.aborted) setDetailsError(err.message); })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false);
      });

    return () => controller.abort();
  }, [property?.providerId]);

  // Fetch Nearby POIs when category or property coordinates change
  useEffect(() => {
    if (!Number.isFinite(details?.latitude) || !Number.isFinite(details?.longitude)) return;

    pendingNearby.current?.abort();
    const controller = new AbortController();
    pendingNearby.current = controller;

    setLoadingNearby(true);
    setNearbyError("");
    setNearbyPois([]);
    setSelectedPoi(null);

    getNearbyPlaces(
      {
        latitude: details.latitude,
        longitude: details.longitude,
        category: activeCategory,
        radiusMeters: 2500,
      },
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setNearbyPois(data.places || []);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setNearbyError(
            err instanceof TypeError
              ? "Could not load nearby places. Check your internet connection."
              : err.message
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingNearby(false);
      });

    return () => controller.abort();
  }, [details?.latitude, details?.longitude, activeCategory]);

  const p = details || property;
  const mapProperties = useMemo(() => [p], [p]);
  const categoryLabel = p.type
    ? p.type.charAt(0).toUpperCase() + p.type.slice(1)
    : "Accommodation";

  return (
    <div className="tw-property-details-view">
      {/* Header Bar */}
      <div className="tw-details-top-bar">
        <SecondaryButton onClick={onBack}>
          ← Back to Results
        </SecondaryButton>
        <div className="tw-details-destination-context">
          <span>Destination context: <strong>{searchParams?.destination?.displayName || "Selected Destination"}</strong></span>
          {searchParams?.checkIn && searchParams?.checkOut && (
            <span className="tw-details-dates">
              · {searchParams.checkIn} to {searchParams.checkOut} ({searchParams.adults || 1} adults, {searchParams.rooms || 1} room)
            </span>
          )}
        </div>
      </div>

      <div className="tw-details-grid">
        {/* Left Column: Property Information */}
        <div className="tw-details-info-column">
          <div className="tw-details-header-card">
            <div className="tw-card-badge-row">
              <span className="tw-stay-badge">{categoryLabel}</span>
              <span className="tw-verified-badge">Provider data</span>
            </div>

            {loadingDetails && <LoadingState label="Loading property details…" />}
            {detailsError && <ErrorState message={detailsError} />}
            <PropertyPhoto property={p} />
            <h1 className="tw-details-title">{p.name || "Unnamed Accommodation"}</h1>

            {p.address && (
              <p className="tw-details-address">
                <span className="tw-icon">📍</span> {p.address}
              </p>
            )}

            <div className="tw-details-meta-pills">
              <span className="tw-meta-pill">
                Coordinates: {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
              </span>
              {Number.isFinite(p.distanceMeters) && p.distanceMeters >= 0 && (
                <span className="tw-meta-pill">
                  {(p.distanceMeters / 1000).toFixed(2)} km from destination centre
                </span>
              )}
            </div>

            {p.description && (
              <div className="tw-details-description">
                <h3>About this property</h3>
                <p>{p.description}</p>
              </div>
            )}

            {/* Supported Amenities (if provider supplies them) */}
            {Array.isArray(p.amenities) && p.amenities.length > 0 && (
              <div className="tw-details-amenities">
                <h3>Reported Facilities & Amenities</h3>
                <ul className="tw-amenities-tags">
                  {p.amenities.map((amenity, i) => (
                    <li key={i} className="tw-amenity-tag">
                      ✓ {amenity}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Provider Contact info if available */}
            {(p.website || p.phone) && (
              <div className="tw-details-contact">
                <h3>Property Contact</h3>
                {safeProviderUrl(p.website) && (
                  <p>
                    <strong>Website:</strong>{" "}
                    <a href={safeProviderUrl(p.website)} target="_blank" rel="noreferrer">
                      {p.website}
                    </a>
                  </p>
                )}
                {p.phone && (
                  <p>
                    <strong>Phone:</strong> {p.phone}
                  </p>
                )}
              </div>
            )}

            {/* Truthful Pricing & Availability Box */}
            <div className="tw-details-pricing-notice">
              <div className="tw-notice-icon">ℹ️</div>
              <div className="tw-notice-body">
                <strong>Live Booking & Pricing Disclosure</strong>
                <p>
                  Live pricing and room availability are not supplied by the Geoapify places discovery provider.
                  Please consult your travel provider, hotel website, or booking service for current rates and room availability.
                </p>
              </div>
            </div>
          </div>

          {/* Nearby Recommendations Section */}
          <section className="tw-nearby-section" aria-label="Nearby exploration">
            <div className="tw-nearby-header">
              <h2>Nearby Recommendations & POIs</h2>
              <p>Up to 20 provider-returned places within 2.5 km. Distances are straight-line.</p>
            </div>

            {/* Category Tabs */}
            <div className="tw-nearby-tabs" role="tablist">
              {NEARBY_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat.key}
                  className={`tw-nearby-tab ${activeCategory === cat.key ? "tw-nearby-tab-active" : ""}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <span className="tw-tab-icon">{cat.icon}</span>
                  <span className="tw-tab-label">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Nearby POI Results */}
            <div className="tw-nearby-content" aria-busy={loadingNearby}>
              {loadingNearby && <LoadingState label={`Discovering nearby ${activeCategory}…`} />}
              {nearbyError && <ErrorState message={nearbyError} />}
              {!loadingNearby && !nearbyError && nearbyPois.length === 0 && (
                <div className="tw-empty-state">
                  <p>No {activeCategory} found within 2.5 km from the provider database.</p>
                </div>
              )}
              {!loadingNearby && !nearbyError && nearbyPois.length > 0 && (
                <div className="tw-nearby-list">
                  {nearbyPois.map((poi) => {
                    const isSelected = selectedPoi?.providerId === poi.providerId;
                    return (
                      <div
                        key={poi.providerId}
                        className={`tw-nearby-card ${isSelected ? "tw-nearby-card-selected" : ""}`}
                        onClick={() => setSelectedPoi(poi)}
                      >
                        <div className="tw-nearby-card-header">
                          <h4 className="tw-nearby-name">{poi.name || "Local Establishment"}</h4>
                          {Number.isFinite(poi.distanceMeters) && (
                            <span className="tw-nearby-distance">
                              {poi.distanceMeters < 1000
                                ? `${Math.round(poi.distanceMeters)} m`
                                : `${(poi.distanceMeters / 1000).toFixed(1)} km`}
                            </span>
                          )}
                        </div>
                        {poi.subCategory && (
                          <div className="tw-nearby-subcat">{poi.subCategory}</div>
                        )}
                        {poi.address && (
                          <div className="tw-nearby-addr">{poi.address}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Interactive Leaflet Map */}
        <div className="tw-details-map-column">
          <div className="tw-details-map-sticky">
            <h3 className="tw-details-map-heading">Interactive Area & POI Map</h3>
            <AccommodationMap
              isDetailsView={true}
              properties={mapProperties}
              selectedProperty={p}
              nearbyPois={nearbyPois}
              selectedPoi={selectedPoi}
              onSelectPoi={setSelectedPoi}
              height="600px"
            />
            <p className="tw-map-legend">
              <span className="tw-legend-item"><span className="tw-pin-sample hotel">🏨</span> Selected Property</span>
              <span className="tw-legend-item"><span className="tw-pin-sample poi">📍</span> Nearby POIs ({activeCategory})</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
