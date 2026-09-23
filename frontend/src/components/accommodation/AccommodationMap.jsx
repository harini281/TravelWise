import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function AccommodationMap({
  properties = [],
  destination = null,
  onHoverProperty,
  selectedProperty = null,
  hoveredPropertyId = null,
  onSelectProperty,
  onSearchArea,
  searchCenter = null,
  nearbyPois = [],
  selectedPoi = null,
  onSelectPoi,
  isDetailsView = false,
  height = "100%",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const poiLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const poiMarkerMapRef = useRef(new Map());

  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const mapMovedCenterRef = useRef(null);
  const initialCenterRef = useRef(searchCenter);
  const callbacks = useRef({});
  useEffect(() => { callbacks.current = { onSelectProperty, onSelectPoi, onHoverProperty }; });

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = searchCenter?.latitude ?? (properties[0]?.latitude ?? 0);
    const initialLon = searchCenter?.longitude ?? (properties[0]?.longitude ?? 0);

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLon],
      zoom: 13,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    // Detect pan/zoom for "Search this area"
    map.on("moveend", () => {
      const center = map.getCenter();
      mapMovedCenterRef.current = { latitude: center.lat, longitude: center.lng, zoom: map.getZoom() };
      
      if (!isDetailsView) setShowSearchAreaBtn(true);
    });

    return () => {
      observer.disconnect();
      try {
        map.off();
        map.stop();
        map.remove();
      } catch {
        // ignore unmount errors
      }
      mapRef.current = null;
    };
  }, []);

  // Update initialCenterRef when searchCenter changes
  useEffect(() => {
    if (searchCenter) {
      initialCenterRef.current = searchCenter;
      setShowSearchAreaBtn(false);
    }
  }, [searchCenter]);

  // Update Accommodation Markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerMapRef.current.clear();

    const validProps = properties.filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) &&
             Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180
    );

    const boundsPoints = [];

    validProps.slice(0, 200).forEach((prop) => {
      const isSelected = false;
      const isHovered = false;

      const icon = L.divIcon({
        className: "tw-leaflet-marker-wrap",
        html: `<div class="tw-map-pin ${isSelected ? "tw-map-pin-selected" : ""} ${isHovered ? "tw-map-pin-hovered" : ""}">
          <span class="tw-map-pin-icon">🏨</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker([prop.latitude, prop.longitude], { icon, title: prop.name || "Accommodation" });
      marker.bindPopup(`
        <div class="tw-map-popup">
          <strong>${escapeHtml(prop.name || "Accommodation")}</strong>
          <div class="tw-popup-type">${escapeHtml(prop.type || "Stay")}</div>
          <div class="tw-popup-address">${escapeHtml(prop.address || "")}</div>
          <div class="tw-popup-notice">Live rates not checked</div>
        </div>
      `);

      marker.on("click", () => {
        callbacks.current.onSelectProperty?.(prop);
      });

      marker.on("mouseover", () => callbacks.current.onHoverProperty?.(prop.providerId));
      marker.on("mouseout", () => callbacks.current.onHoverProperty?.(null));
      marker.addTo(layer);
      markerMapRef.current.set(prop.providerId, marker);
      boundsPoints.push([prop.latitude, prop.longitude]);
    });

    // Auto-fit bounds if results changed and not in details view
    if (!isDetailsView && boundsPoints.length > 0) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: false });
      } catch {
        // ignore bounds fitting errors
      }
    }
  }, [properties, isDetailsView]);

  // Update Nearby POI Markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = poiLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    poiMarkerMapRef.current.clear();

    if (!isDetailsView || !Array.isArray(nearbyPois) || nearbyPois.length === 0) return;

    const boundsPoints = [];
    if (selectedProperty && Number.isFinite(selectedProperty.latitude)) {
      boundsPoints.push([selectedProperty.latitude, selectedProperty.longitude]);
    }

    const poiIcons = {
      restaurants: "🍽️",
      cafes: "☕",
      attractions: "🏛️",
      transport: "🚆",
      healthcare: "🏥",
      shopping: "🛍️",
    };

    nearbyPois.slice(0, 20).forEach((poi) => {
      if (!Number.isFinite(poi.latitude) || !Number.isFinite(poi.longitude)) return;

      const isSelected = false;
      const emoji = poiIcons[poi.category] || "📍";

      const icon = L.divIcon({
        className: "tw-leaflet-marker-wrap",
        html: `<div class="tw-poi-pin tw-poi-pin-${poi.category} ${isSelected ? "tw-poi-pin-selected" : ""}">
          <span>${emoji}</span>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30],
      });

      const marker = L.marker([poi.latitude, poi.longitude], { icon });
      marker.bindPopup(`
        <div class="tw-map-popup">
          <strong>${escapeHtml(poi.name || "Point of Interest")}</strong>
          <div class="tw-popup-type">${escapeHtml(poi.subCategory || poi.category)}</div>
          ${Number.isFinite(poi.distanceMeters) ? `<div class="tw-popup-dist">${Math.round(poi.distanceMeters)}m away</div>` : ""}
          <div class="tw-popup-address">${escapeHtml(poi.address || "")}</div>
        </div>
      `);

      marker.on("click", () => {
        callbacks.current.onSelectPoi?.(poi);
      });

      marker.addTo(layer);
      poiMarkerMapRef.current.set(poi.providerId, marker);
      boundsPoints.push([poi.latitude, poi.longitude]);
    });

    if (boundsPoints.length > 1) {
      try {
        const bounds = L.latLngBounds(boundsPoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: false });
      } catch {
        // ignore
      }
    }
  }, [nearbyPois, isDetailsView, selectedProperty]);

  // Center on selected property if in details view
  useEffect(() => {
    const map = mapRef.current;
    if (isDetailsView && selectedProperty && map && Number.isFinite(selectedProperty.latitude)) {
      try {
        map.setView([selectedProperty.latitude, selectedProperty.longitude], 15, { animate: false });
        const marker = markerMapRef.current.get(selectedProperty.providerId);
        if (marker) marker.openPopup();
      } catch {
        // ignore
      }
    }
  }, [isDetailsView, selectedProperty]);

  useEffect(() => {
    for (const [id, marker] of markerMapRef.current) {
      const pin = marker.getElement()?.querySelector(".tw-map-pin");
      pin?.classList.toggle("tw-map-pin-selected", id === selectedProperty?.providerId);
      pin?.classList.toggle("tw-map-pin-hovered", id === hoveredPropertyId);
      marker.setZIndexOffset(id === hoveredPropertyId || id === selectedProperty?.providerId ? 1000 : 0);
    }
    for (const [id, marker] of poiMarkerMapRef.current)
      marker.getElement()?.querySelector(".tw-poi-pin")?.classList.toggle("tw-poi-pin-selected", id === selectedPoi?.providerId);
  }, [properties, nearbyPois, selectedProperty, hoveredPropertyId, selectedPoi]);

  useEffect(() => {
    if (!destination || !mapRef.current) return;
    const marker = L.marker([destination.latitude, destination.longitude], { title: "Destination", zIndexOffset: -1000, icon: L.divIcon({
      className: "tw-leaflet-marker-wrap", html: '<div class="tw-map-pin">D</div>', iconSize: [36, 36], iconAnchor: [18, 36]
    }) }).addTo(mapRef.current);
    const label = document.createElement("span"); label.textContent = destination.displayName;
    marker.bindTooltip(label);
    return () => marker.remove();
  }, [destination]);

  function fitVisibleResults() {
    const points = [...properties, ...nearbyPois].filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map(p => [p.latitude, p.longitude]);
    if (!points.length && searchCenter) points.push([searchCenter.latitude, searchCenter.longitude]);
    if (points.length) mapRef.current?.fitBounds(points, { padding: [40, 40], maxZoom: 15, animate: false });
  }

  function handleSearchThisArea() {
    setShowSearchAreaBtn(false);
    if (onSearchArea && mapMovedCenterRef.current) {
      onSearchArea(mapMovedCenterRef.current);
    }
  }

  function handleResetView() {
    const map = mapRef.current;
    if (!map || !initialCenterRef.current) return;
    map.setView([initialCenterRef.current.latitude, initialCenterRef.current.longitude], 13, { animate: true });
    setShowSearchAreaBtn(false);
  }

  return (
    <div className="tw-map-wrapper" style={{ height }}>
      <button className="tw-map-fit-control" type="button" onClick={fitVisibleResults}>Fit visible results</button>
      <div ref={containerRef} className="tw-map-container" />
      {showSearchAreaBtn && (
        <div className="tw-map-floating-controls">
          <button
            type="button"
            className="tw-btn-search-area"
            onClick={handleSearchThisArea}
          >
            🔍 Search this area
          </button>
          <button
            type="button"
            className="tw-btn-reset-map"
            onClick={handleResetView}
            title="Return to original destination center"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}
