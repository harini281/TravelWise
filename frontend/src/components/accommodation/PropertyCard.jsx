export default function PropertyCard({ property }) {
  return (
    <article className="tw-stay-card">
      {property.type && <p className="tw-eyebrow">{property.type}</p>}
      <h2>{property.name || "Property name not available"}</h2>
      {property.address && <p>{property.address}</p>}
      <dl>
        <div><dt>Coordinates</dt><dd>{property.latitude}, {property.longitude}</dd></div>
        {Number.isFinite(property.distanceMeters) && property.distanceMeters >= 0 &&
          <div><dt>Distance from destination point</dt><dd>{(property.distanceMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km (straight-line)</dd></div>}
      </dl>
      {property.description && <p>{property.description}</p>}
      <p className="tw-stay-notice">Availability and live pricing not checked</p>
    </article>
  );
}
