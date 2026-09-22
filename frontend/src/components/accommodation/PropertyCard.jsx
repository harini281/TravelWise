export default function PropertyCard({
  property,
  isSelected = false,
  isHovered = false,
  onSelect,
  onViewDetails,
  onMouseEnter,
  onMouseLeave,
}) {
  const type = property.type || "accommodation";
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  // Curated category icons for balanced, honest visual representation
  const categoryIcons = {
    hotel: "🏨",
    resort: "🌴",
    hostel: "🛏️",
    apartment: "🏢",
    guest_house: "🏡",
    motel: "🚗",
    chalet: "🏔️",
  };

  const icon = categoryIcons[type.toLowerCase()] || "🏨";

  return (
    <article
      className={`tw-stay-card ${isSelected ? "tw-stay-card-selected" : ""} ${isHovered ? "tw-stay-card-hovered" : ""}`}
      onMouseEnter={() => onMouseEnter && onMouseEnter(property.providerId)}
      onMouseLeave={() => onMouseLeave && onMouseLeave()}
      onClick={() => onSelect && onSelect(property)}
      tabIndex={0}
      role="article"
      aria-selected={isSelected}
    >
      {/* Visual Category Illustration Banner */}
      <div className="tw-card-visual-header">
        <div className="tw-visual-icon-box">{icon}</div>
        <div className="tw-visual-meta">
          <span className="tw-stay-type-badge">{typeLabel}</span>
          <span className="tw-visual-disclaimer">Category Illustration</span>
        </div>
      </div>

      <div className="tw-card-body">
        <h3 className="tw-stay-name">{property.name || "Property name not available"}</h3>

        {property.address && (
          <p className="tw-stay-address">
            <span className="tw-icon">📍</span> {property.address}
          </p>
        )}

        <dl className="tw-stay-dl">
          <div>
            <dt>Coordinates</dt>
            <dd>
              {Number(property.latitude).toFixed(4)}, {Number(property.longitude).toFixed(4)}
            </dd>
          </div>
          {Number.isFinite(property.distanceMeters) && property.distanceMeters >= 0 && (
            <div>
              <dt>Distance from destination point</dt>
              <dd>
                {(property.distanceMeters / 1000).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                km (straight-line)
              </dd>
            </div>
          )}
        </dl>

        {property.description && (
          <p className="tw-stay-description">{property.description}</p>
        )}

        {/* Supported Amenities (if provider actually supplies them) */}
        {Array.isArray(property.amenities) && property.amenities.length > 0 && (
          <div className="tw-stay-amenities-row">
            {property.amenities.slice(0, 4).map((a, i) => (
              <span key={i} className="tw-amenity-pill">
                ✓ {a}
              </span>
            ))}
            {property.amenities.length > 4 && (
              <span className="tw-amenity-pill-more">+{property.amenities.length - 4} more</span>
            )}
          </div>
        )}

        {/* Transparent Pricing & Availability Notices */}
        <div className="tw-pricing-strip">
          <span className="tw-pricing-tag">Live pricing not available</span>
          <span className="tw-rates-info">Check provider for current rates</span>
        </div>

        <p className="tw-stay-notice">Availability and live pricing not checked</p>

        {/* Action Button */}
        <div className="tw-stay-card-actions">
          <button
            type="button"
            className="tw-btn-view-details"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails(property);
            }}
          >
            View Details & Nearby Places →
          </button>
        </div>
      </div>
    </article>
  );
}
