import { useEffect, useRef } from "react";
import L from "leaflet";

function TripMapView({
  startCoords,
  destCoords,
  startName = "Starting Point",
  destName = "Destination",
  polylineCoords = [],
  distanceKm = null,
  durationMinutes = null,
  height = "380px",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default center on Sri Lanka
    const defaultCenter = [7.8731, 80.7718];
    const defaultZoom = 8;

    // Reset any detached container leaflet ID
    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      mapContainerRef.current._leaflet_id = null;
    }

    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        markersLayerRef.current = L.layerGroup().addTo(map);
        routeLayerRef.current = L.layerGroup().addTo(map);
      } catch (err) {
        console.warn("Leaflet map initialization notice:", err);
        return;
      }
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const routeGroup = routeLayerRef.current;

    markersGroup.clearLayers();
    routeGroup.clearLayers();

    const pointsToFit = [];

    // Custom Icon Generator
    const createMarkerIcon = (color, label) => {
      return L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            background-color: ${color};
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 16px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${label}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });
    };

    if (startCoords && startCoords[0] && startCoords[1]) {
      const startMarker = L.marker(startCoords, {
        icon: createMarkerIcon("#10b981", `📍 ${startName}`),
      }).bindPopup(`<strong>Origin:</strong> ${startName}`);
      markersGroup.addLayer(startMarker);
      pointsToFit.push(startCoords);
    }

    if (destCoords && destCoords[0] && destCoords[1]) {
      const destMarker = L.marker(destCoords, {
        icon: createMarkerIcon("#2563eb", `🎯 ${destName}`),
      }).bindPopup(`<strong>Destination:</strong> ${destName}`);
      markersGroup.addLayer(destMarker);
      pointsToFit.push(destCoords);
    }

    if (polylineCoords && polylineCoords.length > 0) {
      const routeLine = L.polyline(polylineCoords, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      });
      routeGroup.addLayer(routeLine);
      polylineCoords.forEach((p) => pointsToFit.push(p));
    }

    if (pointsToFit.length > 1) {
      const bounds = L.latLngBounds(pointsToFit);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (pointsToFit.length === 1) {
      map.setView(pointsToFit[0], 11);
    }

    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 400);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [startCoords, destCoords, startName, destName, polylineCoords]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop();
          mapInstanceRef.current.remove();
        } catch {
          // ignore unmount transition teardown
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const formatDuration = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m} mins`;
  };

  return (
    <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid var(--border-color)", boxShadow: "var(--shadow-sm)" }}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        style={{
          height,
          width: "100%",
          backgroundColor: "var(--bg-surface)",
          zIndex: 1,
        }}
      />

      {/* Floating Route Telemetry Badge */}
      {(distanceKm != null || durationMinutes != null) && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            zIndex: 1000,
            backgroundColor: "rgba(15, 43, 72, 0.92)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: "10px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "0.84rem",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {distanceKm != null && (
            <div>
              <span style={{ color: "#94a3b8", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>
                Distance
              </span>
              <strong style={{ fontSize: "1rem", color: "#38bdf8" }}>{distanceKm} km</strong>
            </div>
          )}

          {durationMinutes != null && (
            <div>
              <span style={{ color: "#94a3b8", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>
                Est. Duration
              </span>
              <strong style={{ fontSize: "1rem", color: "#4ade80" }}>{formatDuration(durationMinutes)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TripMapView;
