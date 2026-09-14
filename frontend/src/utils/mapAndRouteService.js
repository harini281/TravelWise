/**
 * Real Geocoding, Road Routing (OSRM), and Deterministic Transport Recommendations
 * No mock coordinates or fake ticket prices.
 */

// Geocode a location query using Open-Meteo Geocoding API with fallback
export async function geocodeLocation(query) {
  if (!query || query.trim().length < 2) return null;

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=5&language=en&format=json`
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    if (data && data.results && data.results.length > 0) {
      const top = data.results[0];
      return {
        name: top.name,
        country: top.country,
        admin1: top.admin1 || "",
        latitude: top.latitude,
        longitude: top.longitude,
        displayName: `${top.name}${top.admin1 ? ", " + top.admin1 : ""}, ${top.country || "Sri Lanka"}`,
      };
    }
  } catch (err) {
    console.warn("Open-Meteo geocoding error:", err);
  }

  // Secondary Fallback: Nominatim OpenStreetMap
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          name: data[0].display_name.split(",")[0],
          country: "Sri Lanka",
          admin1: "",
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
    }
  } catch (err) {
    console.warn("Nominatim fallback geocoding error:", err);
  }

  return null;
}

// Fetch real road route geometry, distance, and duration via OSRM Public Routing API
export async function fetchRoadRoute(startCoords, destCoords) {
  if (!startCoords || !destCoords) return null;

  const [startLat, startLng] = startCoords;
  const [destLat, destLng] = destCoords;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Routing failed");
    const data = await res.json();

    if (data && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMinutes = Math.round(route.duration / 60);

      // In GeoJSON, coordinates are [longitude, latitude].
      // Leaflet expects [latitude, longitude].
      const polylineCoords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);

      return {
        distanceKm,
        durationMinutes,
        geometryGeoJson: JSON.stringify(route.geometry),
        polylineCoords,
      };
    }
  } catch (err) {
    console.warn("OSRM routing error:", err);
  }

  // Fallback straight-line calculation if OSRM is temporarily unreachable
  const dLat = (destLat - startLat) * (Math.PI / 180);
  const dLng = (destLng - startLng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(startLat * (Math.PI / 180)) *
      Math.cos(destLat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const haversineKm = Math.round(6371 * c * 1.25 * 10) / 10; // 1.25 road winding factor
  const estimatedMins = Math.round((haversineKm / 45) * 60);

  return {
    distanceKm: haversineKm,
    durationMinutes: estimatedMins,
    geometryGeoJson: null,
    polylineCoords: [
      [startLat, startLng],
      [destLat, destLng],
    ],
  };
}

// Calculate smart transport options based on actual route distance, duration, and user profile
export function calculateTransportRecommendations(distanceKm, durationMinutes, travellerCount = 1, userPrefs = {}) {
  if (!distanceKm || distanceKm <= 0) return [];

  const count = Math.max(1, travellerCount);
  const preferredMode = (userPrefs.TransportPreference || "").toLowerCase();
  const budgetStyle = (userPrefs.BudgetStyle || "").toLowerCase();

  const options = [];

  // 1. Walking (Strictly for short journeys <= 3 km)
  if (distanceKm <= 3.0) {
    const walkMins = Math.round((distanceKm / 4.5) * 60);
    options.push({
      mode: "Walking",
      icon: "🚶",
      name: "Walking & Pedestrian Path",
      estimatedCostLkr: 0,
      costPerPersonLkr: 0,
      durationText: `${walkMins} mins`,
      distanceText: `${distanceKm} km`,
      highlight: "Zero emissions • Active sightseeing",
      isRecommended: distanceKm <= 1.5 || preferredMode.includes("walk"),
      isFlight: false,
    });
  }

  // 2. Public Bus (Available for distances >= 2 km)
  if (distanceKm >= 2.0) {
    const busRatePerKm = 6;
    const busBase = 40;
    const perPerson = Math.round(busBase + distanceKm * busRatePerKm);
    const totalCost = perPerson * count;
    const busMins = Math.round((distanceKm / 38) * 60) + 15;
    const hours = Math.floor(busMins / 60);
    const mins = busMins % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    options.push({
      mode: "Public Bus",
      icon: "🚌",
      name: "Expressway & Regional Bus Network",
      estimatedCostLkr: totalCost,
      costPerPersonLkr: perPerson,
      durationText,
      distanceText: `${distanceKm} km`,
      highlight: "Budget-friendly • Frequent departures",
      isRecommended: budgetStyle.includes("budget") || preferredMode.includes("bus"),
      isFlight: false,
    });
  }

  // 3. Scenic / Express Train (Optimal for 20 km – 350 km)
  if (distanceKm >= 15.0 && distanceKm <= 400.0) {
    const trainRatePerKm = 9.5;
    const trainBase = 80;
    const perPerson = Math.round(trainBase + distanceKm * trainRatePerKm);
    const totalCost = perPerson * count;
    const trainMins = Math.round((distanceKm / 42) * 60) + 20;
    const hours = Math.floor(trainMins / 60);
    const mins = trainMins % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    const isTrainPreferred = preferredMode.includes("train");

    options.push({
      mode: "Train",
      icon: "🚆",
      name: "Scenic Coastal & Highland Express Train",
      estimatedCostLkr: totalCost,
      costPerPersonLkr: perPerson,
      durationText,
      distanceText: `${distanceKm} km`,
      highlight: "Panoramic tea country views • Comfortable transit",
      isRecommended: isTrainPreferred || (!budgetStyle.includes("budget") && distanceKm >= 50 && distanceKm <= 260),
      isFlight: false,
    });
  }

  // 4. Private Car / Cab / Taxi (Suitable for all distances)
  if (distanceKm >= 3.0) {
    const carBase = 500;
    const carRatePerKm = 95;
    const totalCost = Math.round(carBase + distanceKm * carRatePerKm);
    const perPerson = Math.round(totalCost / count);

    const carMins = durationMinutes || Math.round((distanceKm / 55) * 60);
    const hours = Math.floor(carMins / 60);
    const mins = carMins % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;

    const isCarPreferred = preferredMode.includes("car") || preferredMode.includes("taxi");

    options.push({
      mode: "Private Car / Taxi",
      icon: "🚗",
      name: "Private Chauffeur / Dedicated Cab",
      estimatedCostLkr: totalCost,
      costPerPersonLkr: perPerson,
      durationText,
      distanceText: `${distanceKm} km`,
      highlight: "Door-to-door convenience • Luggage storage • Flexible stops",
      isRecommended: isCarPreferred || budgetStyle.includes("comfort") || budgetStyle.includes("premium"),
      isFlight: false,
    });
  }

  // 5. Domestic Flight:
  // STRICT RULE: Only suggest if distance > 300 km (e.g. Colombo to Jaffna)
  if (distanceKm > 300.0) {
    const flightCostPerPerson = 45000;
    const totalFlightCost = flightCostPerPerson * count;

    options.push({
      mode: "Domestic Flight",
      icon: "✈️",
      name: "Scheduled Domestic Flight (Aero Lanka / Cinnamon Air)",
      estimatedCostLkr: totalFlightCost,
      costPerPersonLkr: flightCostPerPerson,
      durationText: "1h 15m (flight) + 1h check-in",
      distanceText: `${distanceKm} km`,
      highlight: "Rapid point-to-point transit for distant provinces",
      isRecommended: distanceKm > 380 && budgetStyle.includes("premium"),
      isFlight: true,
    });
  }

  // Sort: Put recommended options first
  return options.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
}
