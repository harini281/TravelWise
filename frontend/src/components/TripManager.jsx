import { useState, useEffect } from "react";
import { API_BASE_URL } from "../apiConfig";
import TripMapView from "./TripMapView";
import { geocodeLocation, fetchRoadRoute, calculateTransportRecommendations } from "../utils/mapAndRouteService";
import { getRecommendedActivities } from "../utils/destinationRecommendations";

function TripManager({ user, currentTrip, onSelectTrip, onRefreshTrips }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingTripId, setEditingTripId] = useState(null);

  // Wizard form state
  const [startingPlace, setStartingPlace] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [travellerCount, setTravellerCount] = useState(1);
  const [tripType, setTripType] = useState(user?.travelStyle || "Adventure");
  const [travelScope, setTravelScope] = useState("Local");
  const [passportReady, setPassportReady] = useState(false);
  const [insuranceReady, setInsuranceReady] = useState(false);
  const [readinessChecksComplete, setReadinessChecksComplete] = useState(false);
  const [returnTransport, setReturnTransport] = useState("");
  const [foodBudget, setFoodBudget] = useState(0);
  const [returnBudgetReserve, setReturnBudgetReserve] = useState(0);
  const [spentAmount, setSpentAmount] = useState(0);
  const [selectedTransport, setSelectedTransport] = useState("");
  const [status, setStatus] = useState("PLANNING");

  // Telemetry & Map Routing State
  const [startCoords, setStartCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [polylineCoords, setPolylineCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMins, setDurationMins] = useState(0);
  const [routeGeoJson, setRouteGeoJson] = useState(null);
  const [transportOptions, setTransportOptions] = useState([]);
  const [estimatedCost, setEstimatedTransportCost] = useState(0);

  // Weather Advisory State
  const [weatherAdvisory, setWeatherAdvisory] = useState(null);

  // Weather-Based Date Recommendation & Forecast State
  const [weatherPlanning, setWeatherPlanning] = useState(null);
  const [weatherPlanningLoading, setWeatherPlanningLoading] = useState(false);
  const [dismissWeatherWarning, setDismissWeatherWarning] = useState(false);

  // Packing Checklist Interactivity
  const [checkedPackingItems, setCheckedPackingItems] = useState({});

  // Trip Completion State
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);
  const [showManualConfirmModal, setShowManualConfirmModal] = useState(false);
  const [tripToComplete, setTripToComplete] = useState(null);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  // UI feedback state
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [activityFeedback, setActivityFeedback] = useState("");

  // Load Traveller's trips from PostgreSQL
  const loadTrips = async () => {
    try {
      setLoading(true);
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/Trips`, { headers });
      if (!res.ok) throw new Error("Could not load trips");
      const data = await res.json();
      const tripList = Array.isArray(data) ? data : [];
      setTrips(tripList);
      return tripList;
    } catch (err) {
      console.error("Failed to load trips:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [user?.token]);

  // Initial geocoding and routing calculation
  useEffect(() => {
    runRoutingAnalysis(startingPlace, destination, travellerCount);
    fetchWeatherPlanning(destination, startDate, returnDate, tripType);
  }, []);

  // Whenever currentTrip changes, refresh weather planning for it
  useEffect(() => {
    if (currentTrip?.destination) {
      const s = currentTrip.startDate ? currentTrip.startDate.split("T")[0] : startDate;
      const r = currentTrip.returnDate ? currentTrip.returnDate.split("T")[0] : returnDate;
      const t = currentTrip.tripType || tripType;
      fetchWeatherPlanning(currentTrip.destination, s, r, t);
    }
  }, [currentTrip?.id]);

  const runRoutingAnalysis = async (startQuery, destQuery, count) => {
    try {
      setGeocodingLoading(true);
      setFormError("");

      const [startRes, destRes] = await Promise.all([
        geocodeLocation(startQuery),
        geocodeLocation(destQuery),
      ]);

      if (startRes) {
        setStartCoords([startRes.latitude, startRes.longitude]);
      }
      if (destRes) {
        setDestCoords([destRes.latitude, destRes.longitude]);
      }

      if (startRes && destRes) {
        const routeData = await fetchRoadRoute(
          [startRes.latitude, startRes.longitude],
          [destRes.latitude, destRes.longitude]
        );

        if (routeData) {
          setDistanceKm(routeData.distanceKm);
          setDurationMins(routeData.durationMinutes);
          setPolylineCoords(routeData.polylineCoords);
          setRouteGeoJson(routeData.geometryGeoJson);

          const recs = calculateTransportRecommendations(
            routeData.distanceKm,
            routeData.durationMinutes,
            count,
            {
              TransportPreference: user?.transportPreference,
              BudgetStyle: user?.budgetStyle,
            }
          );
          setTransportOptions(recs);

          // Default selected transport
          if (recs.length > 0) {
            const top = recs.find((r) => r.isRecommended) || recs[0];
            setSelectedTransport(top.mode);
            setEstimatedTransportCost(top.estimatedCostLkr);
          }
        }
      }

      fetchWeatherAdvisory(destQuery);
      fetchWeatherPlanning(destQuery, startDate, returnDate, tripType);
    } catch (err) {
      console.warn("Routing analysis error:", err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  const fetchWeatherAdvisory = async (dest) => {
    if (!dest) return;
    try {
      const q = encodeURIComponent(dest);
      const t = encodeURIComponent(tripType || "");
      const res = await fetch(`${API_BASE_URL}/api/Risk/weather?location=${q}&tripType=${t}`);
      if (res.ok) {
        const data = await res.json();
        setWeatherAdvisory(data);
      }
    } catch (e) {
      console.warn("Weather advisory error:", e);
    }
  };

  // Weather-Aware Date Planning & Alternative Date Suggestions
  const fetchWeatherPlanning = async (loc, sDate, rDate, type) => {
    if (!loc) return;
    try {
      setWeatherPlanningLoading(true);
      setDismissWeatherWarning(false);
      const qLoc = encodeURIComponent(loc);
      const qStart = encodeURIComponent(sDate || "");
      const qReturn = encodeURIComponent(rDate || "");
      const qType = encodeURIComponent(type || "");
      const interests = encodeURIComponent(
        Array.isArray(user?.interests) ? user.interests.join(",") : (user?.interests || "")
      );

      const res = await fetch(
        `${API_BASE_URL}/api/Risk/weather/forecast?location=${qLoc}&startDate=${qStart}&returnDate=${qReturn}&tripType=${qType}&interests=${interests}`
      );
      if (res.ok) {
        const data = await res.json();
        setWeatherPlanning(data);
      }
    } catch (err) {
      console.warn("Weather planning fetch error:", err);
    } finally {
      setWeatherPlanningLoading(false);
    }
  };

  // Switch to Alternative Weather Dates
  const handleApplyAlternativeDates = async (altOption) => {
    const newStart = altOption.suggestedStartDate;
    const newReturn = altOption.suggestedReturnDate;

    setStartDate(newStart);
    setReturnDate(newReturn);

    // If currently editing or viewing an active trip, update on backend
    const targetTrip = currentTrip;
    if (targetTrip && targetTrip.id) {
      try {
        const headers = {
          "Content-Type": "application/json",
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        };

        const payload = {
          ...targetTrip,
          startDate: new Date(newStart).toISOString(),
          returnDate: new Date(newReturn).toISOString(),
        };

        const res = await fetch(`${API_BASE_URL}/api/Trips/${targetTrip.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const updated = await res.json();
          onSelectTrip(updated);
          await loadTrips();
          setFormSuccess(`Updated dates to ${newStart} – ${newReturn} (${altOption.reason})`);
          setTimeout(() => setFormSuccess(""), 4000);
        }
      } catch (err) {
        console.warn("Failed to update trip dates:", err);
      }
    }

    // Re-evaluate weather planning for the new dates
    fetchWeatherPlanning(
      targetTrip?.destination || destination,
      newStart,
      newReturn,
      targetTrip?.tripType || tripType
    );
  };

  // Toggle packing checklist item
  const togglePackingItem = (itemKey) => {
    setCheckedPackingItems((prev) => ({
      ...prev,
      [itemKey]: !prev[itemKey],
    }));
  };

  // ==========================================
  // TRIP COMPLETION: LIVE ARRIVAL & MANUAL
  // ==========================================

  // Live Location Arrival Detection (Haversine <= 500m)
  const handleLiveLocationArrival = async (trip) => {
    if (!trip || !trip.id) return;
    if (trip.status === "COMPLETED") {
      setLocationFeedback({
        type: "info",
        message: `This trip to ${trip.destination} is already marked as COMPLETED.`,
      });
      return;
    }

    if (!navigator.geolocation) {
      setLocationFeedback({
        type: "warning",
        message: "Geolocation is not supported by your browser. Please use the 'Mark Trip Complete' button instead.",
      });
      return;
    }

    try {
      setLocationDetecting(true);
      setLocationFeedback({
        type: "info",
        message: "Requesting device GPS coordinates to verify destination proximity...",
      });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            const headers = {
              "Content-Type": "application/json",
              ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
            };

            const res = await fetch(`${API_BASE_URL}/api/Trips/${trip.id}/complete`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                completionMethod: "LOCATION",
                currentLatitude: latitude,
                currentLongitude: longitude,
              }),
            });

            const data = await res.json();

            if (res.ok) {
              setLocationFeedback(null);
              setCelebrationData({
                destination: data.destination || trip.destination,
                completedAt: data.completedAt || new Date().toISOString(),
                completionMethod: "LOCATION",
                message: data.message || `🎉 Congratulations! You've reached ${trip.destination}.`,
              });
              setShowCelebrationModal(true);

              const refreshed = await loadTrips();
              const updatedTrip = refreshed.find((t) => t.id === trip.id) || {
                ...trip,
                status: "COMPLETED",
                completedAt: data.completedAt,
                completionMethod: "LOCATION",
              };
              onSelectTrip(updatedTrip);
              if (onRefreshTrips) onRefreshTrips();
            } else {
              // Beyond 500m or coordinate resolution issue
              setLocationFeedback({
                type: "warning",
                message: data.message || "Live arrival requires being within 500 metres of your destination. You can still mark the trip complete manually.",
              });
            }
          } catch (err) {
            setLocationFeedback({
              type: "error",
              message: `Live arrival check error: ${err.message}`,
            });
          } finally {
            setLocationDetecting(false);
          }
        },
        (error) => {
          setLocationDetecting(false);
          let errMsg = "Location permission denied or unavailable.";
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = "Location access was denied. You can safely complete the trip using 'Mark Trip Complete'.";
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errMsg = "Location signal unavailable. Please use manual completion.";
          } else if (error.code === error.TIMEOUT) {
            errMsg = "Location request timed out. Please retry or use manual completion.";
          }
          setLocationFeedback({ type: "warning", message: errMsg });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      setLocationDetecting(false);
      setLocationFeedback({ type: "error", message: err.message });
    }
  };

  // Manual Trip Completion
  const initiateManualCompletion = (trip) => {
    setTripToComplete(trip);
    setShowManualConfirmModal(true);
  };

  const confirmManualCompletion = async () => {
    if (!tripToComplete) return;

    try {
      setCompletionLoading(true);
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/api/Trips/${tripToComplete.id}/complete`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          completionMethod: "MANUAL",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to complete trip.");
      }

      const data = await res.json();
      setShowManualConfirmModal(false);

      setCelebrationData({
        destination: data.destination || tripToComplete.destination,
        completedAt: data.completedAt || new Date().toISOString(),
        completionMethod: "MANUAL",
        message: data.message || `🎉 Congratulations! You've completed your trip to ${tripToComplete.destination}.`,
      });
      setShowCelebrationModal(true);

      const refreshed = await loadTrips();
      const updated = refreshed.find((t) => t.id === tripToComplete.id) || {
        ...tripToComplete,
        status: "COMPLETED",
        completedAt: data.completedAt,
        completionMethod: "MANUAL",
      };
      onSelectTrip(updated);
      if (onRefreshTrips) onRefreshTrips();
    } catch (err) {
      alert(`Could not complete trip: ${err.message}`);
    } finally {
      setCompletionLoading(false);
      setTripToComplete(null);
    }
  };

  const handleCreateOrUpdateTrip = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (new Date(returnDate) < new Date(startDate)) {
      setFormError("Return date must be on or after the start date.");
      return;
    }

    if (budgetAmount <= 0) {
      setFormError("Budget amount must be greater than zero.");
      return;
    }

    if (travellerCount < 1) {
      setFormError("Traveller count must be at least 1.");
      return;
    }

    if (travelScope === "International" && (!passportReady || !insuranceReady || !readinessChecksComplete)) {
      setFormError("International trips require passport, travel insurance, and completed readiness checks.");
      return;
    }

    const tripDays = Math.max(1, Math.ceil((new Date(returnDate) - new Date(startDate)) / 86400000));
    const calculatedReturnReserve = Number(returnBudgetReserve) || Math.round(Number(budgetAmount) * 0.2);
    const calculatedFoodBudget = Number(foodBudget) || Math.round(Math.max(0, Number(budgetAmount) - calculatedReturnReserve) * 0.25);

    const payload = {
      startingPlace: startingPlace.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate).toISOString(),
      returnDate: new Date(returnDate).toISOString(),
      budgetAmount: Number(budgetAmount),
      spentAmount: Number(spentAmount) || 0,
      foodBudget: calculatedFoodBudget,
      returnBudgetReserve: calculatedReturnReserve,
      originalReturnDate: new Date(returnDate).toISOString(),
      travellerCount: Number(travellerCount),
      tripType: tripType.trim(),
      travelScope,
      passportRequired: travelScope === "International",
      travelInsuranceRequired: travelScope === "International",
      readinessChecksComplete: travelScope === "Local" ? true : readinessChecksComplete,
      baggagePlan: travelScope === "International" ? "Passport-safe baggage plan" : "Standard baggage plan",
      returnTransport: returnTransport || selectedTransport,
      status,
      selectedTransport,
      estimatedDistanceKm: distanceKm,
      estimatedDurationMinutes: durationMins,
      estimatedTransportCost: estimatedCost,
      startLatitude: startCoords[0],
      startLongitude: startCoords[1],
      destinationLatitude: destCoords[0],
      destinationLongitude: destCoords[1],
      routeGeometryJson: routeGeoJson,
    };

    try {
      const headers = {
        "Content-Type": "application/json",
        ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
      };

      const url = editingTripId
        ? `${API_BASE_URL}/api/Trips/${editingTripId}`
        : `${API_BASE_URL}/api/Trips`;

      const method = editingTripId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Failed to save trip.");
      }

      const savedTrip = await res.json();
      setFormSuccess(editingTripId ? "Trip updated successfully!" : "Trip created successfully!");

      await loadTrips();
      onSelectTrip(savedTrip);
      if (onRefreshTrips) onRefreshTrips();

      setTimeout(() => {
        setShowWizard(false);
        setEditingTripId(null);
        setFormSuccess("");
      }, 1000);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm("Are you sure you want to delete this trip? This action cannot be undone.")) {
      return;
    }

    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await fetch(`${API_BASE_URL}/api/Trips/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete trip");

      await loadTrips();
      if (currentTrip?.id === id) {
        const remaining = trips.filter((t) => t.id !== id);
        if (remaining.length > 0) {
          onSelectTrip(remaining[0]);
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditTrip = (trip) => {
    setEditingTripId(trip.id);
    setStartingPlace(trip.startingPlace || "");
    setDestination(trip.destination || "");
    setStartDate(trip.startDate ? trip.startDate.split("T")[0] : "");
    setReturnDate(trip.returnDate ? trip.returnDate.split("T")[0] : "");
    setBudgetAmount(trip.budgetAmount || "");
    setTravellerCount(trip.travellerCount || 1);
    setTripType(trip.tripType || "Adventure");
    setTravelScope(trip.travelScope || "Local");
    setPassportReady(Boolean(trip.passportRequired));
    setInsuranceReady(Boolean(trip.travelInsuranceRequired));
    setReadinessChecksComplete(Boolean(trip.readinessChecksComplete));
    setReturnTransport(trip.returnTransport || "");
    setFoodBudget(trip.foodBudget || 0);
    setReturnBudgetReserve(trip.returnBudgetReserve || 0);
    setSpentAmount(trip.spentAmount || 0);
    setSelectedTransport(trip.selectedTransport || "");
    setStatus(trip.status || "PLANNING");

    setShowWizard(true);
    runRoutingAnalysis(trip.startingPlace || "", trip.destination || "", trip.travellerCount || 1);
  };

  const startReturnPlanning = (trip) => {
    startEditTrip(trip);
    setFormSuccess("Update the return date and transport, then save your return plan.");
  };

  const handleAddCuratedActivity = async (activity) => {
    if (!currentTrip?.id) {
      setActivityFeedback("Please select an active trip first.");
      return;
    }

    try {
      setActivityFeedback(`Adding "${activity.name}" to trip itinerary...`);

      const tripStart = new Date(currentTrip.startDate);
      const scheduledStart = new Date(tripStart);
      scheduledStart.setHours(10, 0, 0, 0);

      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (activity.durationMinutes || 90));

      const payload = {
        tripId: currentTrip.id,
        name: activity.name,
        category: activity.category,
        description: activity.description,
        location: activity.location,
        estimatedCost: activity.estimatedCost,
        durationMinutes: activity.durationMinutes,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
      };

      const res = await fetch(`${API_BASE_URL}/api/Activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Could not add activity to trip.");
      }

      setActivityFeedback(`✓ Successfully added "${activity.name}" to your trip itinerary!`);
      setTimeout(() => setActivityFeedback(""), 4000);
    } catch (err) {
      setActivityFeedback(`Notice: ${err.message}`);
      setTimeout(() => setActivityFeedback(""), 5000);
    }
  };

  const curatedActivities = getRecommendedActivities(
    currentTrip?.destination || destination,
    user?.interests,
    weatherAdvisory?.weatherCondition
  );

  // Combine packing recommendations from planning and advisory
  const effectivePackingList =
    weatherPlanning?.packingRecommendations?.length > 0
      ? weatherPlanning.packingRecommendations
      : weatherAdvisory?.packingChecklist?.length > 0
      ? weatherAdvisory.packingChecklist
      : [
          "Lightweight cotton daywear",
          "Sun protection (SPF 50+)",
          "Comfortable walking shoes",
          "Refillable water bottle",
          "Compact rain poncho / umbrella",
        ];

  const totalPackedCount = effectivePackingList.filter((item) => checkedPackingItems[item]).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Banner & Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 4px" }}>
            Trip Planning & Itinerary Command
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", margin: 0 }}>
            Live GPS arrival detection, deterministic transport recommendations, and weather-aware date suggestions.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="auth-btn-primary"
            style={{ padding: "10px 18px", fontSize: "0.9rem" }}
            onClick={() => {
              setEditingTripId(null);
              setShowWizard(true);
            }}
          >
            <span>➕</span> Plan New Trip
          </button>
        </div>
      </div>

      {/* Trips Carousel / Selector */}
      <div className="tw-card">
        <div className="tw-card-header">
          <h3 className="tw-card-title">
            <span>🗺️</span> Your Registered Trips ({trips.length})
          </h3>
          <span className="badge badge-info">Logged-in Traveller: {user?.username}</span>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "16px 0" }}>Loading your trips from database...</p>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🎒</div>
            <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>No trips planned yet.</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "16px" }}>
              Create your first Sri Lankan travel expedition with real road routing and live weather.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingTripId(null);
                setShowWizard(true);
              }}
            >
              Plan a Trip Now
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {trips.map((t) => {
              const isSelected = currentTrip?.id === t.id;
              const isCompleted = t.status === "COMPLETED";
              const startFmt = t.startDate ? new Date(t.startDate).toLocaleDateString() : "TBD";
              const returnFmt = t.returnDate ? new Date(t.returnDate).toLocaleDateString() : "TBD";

              return (
                <div
                  key={t.id}
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    border: isSelected ? "2px solid var(--secondary)" : "1px solid var(--border-color)",
                    backgroundColor: isSelected ? "rgba(37, 99, 235, 0.04)" : "var(--bg-surface)",
                    boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    position: "relative",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                        {t.tripType || "Adventure"}
                      </span>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: isCompleted ? "#15803d" : isSelected ? "var(--secondary)" : "#64748b",
                          color: "#fff",
                        }}
                      >
                        {isCompleted ? "✓ COMPLETED" : t.status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-primary)" }}>
                      {t.startingPlace} ➔ {t.destination}
                    </h4>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                      <div>📅 <strong>{startFmt} – {returnFmt}</strong></div>
                      <div>👥 <strong>{t.travellerCount} Travellers</strong> • Budget: <strong>LKR {t.budgetAmount?.toLocaleString()}</strong></div>
                      {t.selectedTransport && (
                        <div style={{ marginTop: "4px", color: "var(--primary)", fontWeight: 600 }}>
                          🚀 Mode: {t.selectedTransport} {t.estimatedDistanceKm ? `(${t.estimatedDistanceKm} km)` : ""}
                        </div>
                      )}
                      {isCompleted && (
                        <div style={{ marginTop: "6px", color: "#15803d", fontWeight: 700, fontSize: "0.8rem" }}>
                          🏆 Completed via {t.completionMethod === "LOCATION" ? "📍 GPS Arrival" : "🏁 Manual Confirmation"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border-color)", paddingTop: "12px", flexWrap: "wrap" }}>
                    {!isSelected ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => onSelectTrip(t)}
                      >
                        ✓ Select Active
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--secondary)", alignSelf: "center", flex: 1 }}>
                        ★ Active Trip
                      </span>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => startEditTrip(t)}
                      title="Edit Trip Parameters"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleDeleteTrip(t.id)}
                      title="Delete Trip"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Inline Trip Creation & Editing Wizard */}
      {showWizard && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
              {editingTripId ? "✏️ Edit Trip Parameters" : "✨ Create Personalized Trip"}
            </h3>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowWizard(false)}
            >
              ✕ Close
            </button>
          </div>

          {formError && (
            <div style={{ padding: "10px 14px", backgroundColor: "#fee2e2", borderLeft: "4px solid #ef4444", color: "#b91c1c", marginBottom: "16px", borderRadius: "6px", fontSize: "0.88rem" }}>
              {formError}
            </div>
          )}

          {formSuccess && (
            <div style={{ padding: "10px 14px", backgroundColor: "#dcfce7", borderLeft: "4px solid #22c55e", color: "#15803d", marginBottom: "16px", borderRadius: "6px", fontSize: "0.88rem" }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreateOrUpdateTrip}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="auth-label">Starting Place</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    className="auth-input"
                    value={startingPlace}
                    onChange={(e) => setStartingPlace(e.target.value)}
                    placeholder="e.g. Colombo, Negombo, Kandy"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="auth-label">Destination</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    type="text"
                    className="auth-input"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Ella, Sigiriya, Galle, Jaffna"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      runRoutingAnalysis(startingPlace, destination, travellerCount);
                      fetchWeatherPlanning(destination, startDate, returnDate, tripType);
                    }}
                    disabled={geocodingLoading}
                    title="Recalculate route & map telemetry"
                  >
                    {geocodingLoading ? "..." : "🔍 Route"}
                  </button>
                </div>
              </div>

              <div>
                <label className="auth-label">Start Date</label>
                <input
                  type="date"
                  className="auth-input"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    fetchWeatherPlanning(destination, e.target.value, returnDate, tripType);
                  }}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Return Date</label>
                <input
                  type="date"
                  className="auth-input"
                  value={returnDate}
                  onChange={(e) => {
                    setReturnDate(e.target.value);
                    fetchWeatherPlanning(destination, startDate, e.target.value, tripType);
                  }}
                  required
                />
              </div>

              <div>
                <label className="auth-label">Total Budget (LKR)</label>
                <input
                  type="number"
                  className="auth-input"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  min="1000"
                  step="1000"
                  required
                />
              </div>

              <div>
                <label className="auth-label">Traveller Count</label>
                <input
                  type="number"
                  className="auth-input"
                  value={travellerCount}
                  onChange={(e) => {
                    const c = parseInt(e.target.value) || 1;
                    setTravellerCount(c);
                    runRoutingAnalysis(startingPlace, destination, c);
                  }}
                  min="1"
                  max="50"
                  required
                />
              </div>

              <div>
                <label className="auth-label">Trip Style / Type</label>
                <select
                  className="auth-input"
                  value={tripType}
                  onChange={(e) => {
                    setTripType(e.target.value);
                    fetchWeatherAdvisory(destination);
                    fetchWeatherPlanning(destination, startDate, returnDate, e.target.value);
                  }}
                >
                  <option value="Adventure">Adventure</option>
                  <option value="Culture & History">Culture & History</option>
                  <option value="Relaxation">Relaxation</option>
                  <option value="Food & Culinary">Food & Culinary</option>
                  <option value="Family">Family</option>
                  <option value="Business">Business</option>
                </select>
              </div>

              <div>
                <label className="auth-label">Trip Scope</label>
                <select className="auth-input" value={travelScope} onChange={(e) => setTravelScope(e.target.value)}>
                  <option value="Local">Local</option>
                  <option value="International">International</option>
                </select>
              </div>

              <div>
                <label className="auth-label">Return Transport</label>
                <input className="auth-input" value={returnTransport} onChange={(e) => setReturnTransport(e.target.value)} placeholder="e.g. Train, Bus, Flight" />
              </div>

              <div>
                <label className="auth-label">Return Budget Reserve (LKR)</label>
                <input type="number" className="auth-input" value={returnBudgetReserve} onChange={(e) => setReturnBudgetReserve(e.target.value)} min="0" step="1000" />
              </div>

              <div>
                <label className="auth-label">Food Budget (LKR)</label>
                <input type="number" className="auth-input" value={foodBudget} onChange={(e) => setFoodBudget(e.target.value)} min="0" step="500" />
              </div>

              {travelScope === "International" && (
                <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: "14px", padding: "12px", background: "#eff6ff", borderRadius: "8px" }}>
                  <label><input type="checkbox" checked={passportReady} onChange={(e) => setPassportReady(e.target.checked)} /> Passport ready</label>
                  <label><input type="checkbox" checked={insuranceReady} onChange={(e) => setInsuranceReady(e.target.checked)} /> Travel insurance arranged</label>
                  <label><input type="checkbox" checked={readinessChecksComplete} onChange={(e) => setReadinessChecksComplete(e.target.checked)} /> Readiness checks complete</label>
                </div>
              )}

              <div>
                <label className="auth-label">Status</label>
                <select
                  className="auth-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="PLANNING">PLANNING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Live Interactive Map Preview */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary)" }}>
                  🗺️ Live Road Route & Spatial Geolocation
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Powered by OpenStreetMap & OSRM Routing Engine
                </span>
              </div>

              <TripMapView
                startCoords={startCoords}
                destCoords={destCoords}
                startName={startingPlace}
                destName={destination}
                polylineCoords={polylineCoords}
                distanceKm={distanceKm}
                durationMinutes={durationMins}
                height="320px"
              />
            </div>

            {/* Smart Transport Recommendation Matrix */}
            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary)", margin: "0 0 10px" }}>
                🚆 Smart Transport Recommendations (Based on {distanceKm} km route)
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                {transportOptions.map((opt) => {
                  const isChosen = selectedTransport === opt.mode;

                  return (
                    <div
                      key={opt.mode}
                      onClick={() => {
                        setSelectedTransport(opt.mode);
                        setEstimatedTransportCost(opt.estimatedCostLkr);
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        border: isChosen ? "2px solid var(--secondary)" : "1px solid var(--border-color)",
                        backgroundColor: isChosen ? "rgba(37, 99, 235, 0.05)" : "var(--bg-surface-alt)",
                        cursor: "pointer",
                        boxShadow: isChosen ? "var(--shadow-sm)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{opt.icon}</span>
                        {opt.isRecommended && (
                          <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
                            RECOMMENDED
                          </span>
                        )}
                      </div>

                      <strong style={{ fontSize: "0.95rem", display: "block", color: "var(--text-primary)" }}>
                        {opt.mode}
                      </strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "3px 0" }}>
                        {opt.highlight}
                      </div>

                      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--secondary)", marginTop: "8px" }}>
                        LKR {opt.estimatedCostLkr.toLocaleString()}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "normal", marginLeft: "4px" }}>
                          (total for {travellerCount} pax)
                        </span>
                      </div>

                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                        ⏱️ Est. {opt.durationText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowWizard(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="auth-btn-primary"
                style={{ padding: "10px 24px" }}
              >
                {editingTripId ? "💾 Update Trip" : "🚀 Save & Plan Trip"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Selected Trip Details, Completion Command & Interactive Map View */}
      {currentTrip && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Main Trip Card with Real Interactive Map & Status Header */}
          <div className="tw-card">
            <div className="tw-card-header" style={{ flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 className="tw-card-title">
                  <span>📍</span> {currentTrip.startingPlace} ➔ {currentTrip.destination} Expedition
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Trip ID #{currentTrip.id} • Registered to {user?.username}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: currentTrip.status === "COMPLETED" ? "#15803d" : "#2563eb",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    padding: "4px 10px",
                  }}
                >
                  {currentTrip.status === "COMPLETED" ? "✓ COMPLETED" : currentTrip.status}
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SMART TRIP COMPLETION COMMAND BAR */}
            {/* ========================================================= */}
            <div
              style={{
                backgroundColor: currentTrip.status === "COMPLETED" ? "#f0fdf4" : "var(--bg-surface-alt)",
                border: currentTrip.status === "COMPLETED" ? "1px solid #bbf7d0" : "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🏁</span> Trip Arrival & Completion Status
                  </h4>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {currentTrip.status === "COMPLETED"
                      ? `Trip reached ${currentTrip.destination} on ${new Date(currentTrip.completedAt || Date.now()).toLocaleString()} via ${
                          currentTrip.completionMethod === "LOCATION" ? "Live Location Arrival Detection (within 500m)" : "Manual Traveller Confirmation"
                        }.`
                      : `You can complete this trip automatically upon arrival at ${currentTrip.destination} (within 500m GPS radius) or confirm manually.`}
                  </p>
                </div>

                {/* Completion Action Buttons */}
                {currentTrip.status !== "COMPLETED" ? (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "linear-gradient(180deg, #0d9488 0%, #0f766e 100%)",
                        borderColor: "#0f766e",
                      }}
                      onClick={() => handleLiveLocationArrival(currentTrip)}
                      disabled={locationDetecting}
                      title="Detect live coordinates via browser geolocation and verify if within 500m"
                    >
                      <span>📍</span> {locationDetecting ? "Checking Proximity..." : "Detect Live GPS Arrival"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ padding: "8px 16px", fontSize: "0.85rem", fontWeight: 600 }}
                      onClick={() => initiateManualCompletion(currentTrip)}
                      title="Confirm manual completion of this expedition"
                    >
                      <span>🏁</span> Mark Trip Complete
                    </button>
                  </div>
                ) : (
                  <span className="badge badge-success" style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
                    🎉 Expedition Completed
                  </span>
                )}
              </div>

              {/* Location Feedback Banner */}
              {locationFeedback && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    backgroundColor:
                      locationFeedback.type === "error"
                        ? "#fef2f2"
                        : locationFeedback.type === "warning"
                        ? "#fffbeb"
                        : "#eff6ff",
                    borderLeft: `4px solid ${
                      locationFeedback.type === "error"
                        ? "#ef4444"
                        : locationFeedback.type === "warning"
                        ? "#f59e0b"
                        : "#3b82f6"
                    }`,
                    color:
                      locationFeedback.type === "error"
                        ? "#991b1b"
                        : locationFeedback.type === "warning"
                        ? "#92400e"
                        : "#1e40af",
                    fontSize: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{locationFeedback.message}</span>
                  <button
                    type="button"
                    onClick={() => setLocationFeedback(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: "bold" }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Map */}
            <div style={{ marginBottom: "16px" }}>
              <TripMapView
                startCoords={
                  currentTrip.startLatitude && currentTrip.startLongitude
                    ? [currentTrip.startLatitude, currentTrip.startLongitude]
                    : startCoords
                }
                destCoords={
                  currentTrip.destinationLatitude && currentTrip.destinationLongitude
                    ? [currentTrip.destinationLatitude, currentTrip.destinationLongitude]
                    : destCoords
                }
                startName={currentTrip.startingPlace}
                destName={currentTrip.destination}
                polylineCoords={polylineCoords}
                distanceKm={currentTrip.estimatedDistanceKm || distanceKm}
                durationMinutes={currentTrip.estimatedDurationMinutes || durationMins}
                height="360px"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginTop: "16px" }}>
              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Dates</span>
                <strong>
                  {currentTrip.startDate ? new Date(currentTrip.startDate).toLocaleDateString() : "10 Oct 2026"} –{" "}
                  {currentTrip.returnDate ? new Date(currentTrip.returnDate).toLocaleDateString() : "13 Oct 2026"}
                </strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Travellers</span>
                <strong>{currentTrip.travellerCount || 2} Persons</strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Allocated Budget</span>
                <strong>LKR {(currentTrip.budgetAmount || 0).toLocaleString()}</strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Selected Transport</span>
                <strong style={{ color: "var(--secondary)" }}>
                  {currentTrip.selectedTransport || selectedTransport}
                </strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Return Reserve</span>
                <strong>LKR {(currentTrip.returnBudgetReserve || 0).toLocaleString()}</strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Safe to Spend</span>
                <strong style={{ color: "var(--secondary)" }}>
                  LKR {Math.max(0, (currentTrip.budgetAmount || 0) - (currentTrip.spentAmount || 0) - (currentTrip.returnBudgetReserve || 0)).toLocaleString()}
                </strong>
              </div>

              <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "var(--radius-sm)" }}>
                <span className="kpi-label">Food Budget</span>
                <strong>LKR {(currentTrip.foodBudget || 0).toLocaleString()}</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => startReturnPlanning(currentTrip)}>
                Plan Return Trip
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* WEATHER-BASED DATE RECOMMENDATION & PLANNING */}
          {/* ========================================================= */}
          <div className="tw-card">
            <div className="tw-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>🌦️</span>
                <div>
                  <h3 className="tw-card-title">
                    Weather-Aware Travel Date Recommendation ({currentTrip.destination})
                  </h3>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Real-time atmospheric forecast from Open-Meteo with safety evaluation
                  </span>
                </div>
              </div>

              {weatherPlanning && (
                <span
                  className={`badge ${
                    weatherPlanning.isPlannedWeatherSuitable ? "badge-success" : "badge-danger"
                  }`}
                  style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                >
                  {weatherPlanning.isPlannedWeatherSuitable ? "✓ SUITABLE CONDITIONS" : "⚠ ADVERSE WEATHER DETECTED"}
                </span>
              )}
            </div>

            {weatherPlanningLoading ? (
              <p style={{ color: "var(--text-muted)", padding: "14px 0" }}>
                Evaluating Open-Meteo atmospheric telemetry and date safety...
              </p>
            ) : weatherPlanning ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* 1. Dates outside forecast window (>16 days) */}
                {!weatherPlanning.isForecastAvailable && weatherPlanning.isSeasonalGeneralInfo && (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "#f0f9ff",
                      border: "1px solid #bae6fd",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>📅</span>
                      <strong style={{ fontSize: "0.95rem", color: "#0369a1" }}>
                        Detailed weather forecast is not available yet.
                      </strong>
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        backgroundColor: "#e0f2fe",
                        color: "#0284c7",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        marginBottom: "8px",
                      }}
                    >
                      {weatherPlanning.seasonalLabel || "Seasonal Climate Context (Not a Live Forecast)"}
                    </span>

                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 10px" }}>
                      {weatherPlanning.seasonalSummary}
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                      Live atmospheric forecasts open within 16 days of departure. Baseline climate patterns will guide your preparations.
                    </p>
                  </div>
                )}

                {/* 2. Within Forecast Range: Planned Dates Unsuitable Warning */}
                {weatherPlanning.isForecastAvailable &&
                  !weatherPlanning.isPlannedWeatherSuitable &&
                  !dismissWeatherWarning && (
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <span style={{ fontSize: "1.3rem" }}>⚠️</span>
                          <strong style={{ fontSize: "1rem", color: "#b45309" }}>
                            Weather conditions may not be suitable for your planned dates.
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: "0.75rem", borderColor: "#fde68a" }}
                          onClick={() => setDismissWeatherWarning(true)}
                        >
                          Keep My Original Dates
                        </button>
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#92400e", marginBottom: "4px" }}>
                          Identified Weather Hazards:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", color: "#78350f" }}>
                          {weatherPlanning.unsuitableReasons?.map((reason, idx) => (
                            <li key={idx} style={{ marginBottom: "2px" }}>{reason}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Better Alternative Date Suggestions */}
                      {weatherPlanning.alternativeDateSuggestions?.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", marginBottom: "8px" }}>
                            🌤️ Better Alternative Dates (Forecast-Verified Window):
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px" }}>
                            {weatherPlanning.alternativeDateSuggestions.map((alt, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: "12px",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #fcd34d",
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                }}
                              >
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                    <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                                      {alt.suggestedStartDate} – {alt.suggestedReturnDate}
                                    </strong>
                                    <span className="badge badge-success" style={{ fontSize: "0.68rem" }}>
                                      {alt.suitabilityLevel}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                    {alt.condition} • {alt.minTemperatureC}°C – {alt.maxTemperatureC}°C
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#047857", marginTop: "3px" }}>
                                    ✓ {alt.reason}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="auth-btn-primary"
                                  style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                                  onClick={() => handleApplyAlternativeDates(alt)}
                                >
                                  Use These Dates
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* 3. Within Forecast Range: Planned Dates Suitable */}
                {weatherPlanning.isForecastAvailable && weatherPlanning.isPlannedWeatherSuitable && (
                  <div
                    style={{
                      padding: "14px 16px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "1.3rem" }}>✓</span>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "#15803d", display: "block" }}>
                        Good conditions for your planned trip.
                      </strong>
                      <span style={{ fontSize: "0.82rem", color: "#166534" }}>
                        Atmospheric risk score is {weatherPlanning.plannedWeatherRiskScore}/100 ({weatherPlanning.plannedWeatherRiskLevel} risk). Forecast indicates favorable skies and safe road passability.
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Weather-Aware Dynamic Packing Checklist */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-alt)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)" }}>
                        🎒 Dynamic Packing Recommendations
                      </h4>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Tailored deterministically to {currentTrip.destination} weather & {currentTrip.tripType || "Adventure"} style
                      </span>
                    </div>

                    <span className="badge badge-info" style={{ fontSize: "0.75rem" }}>
                      Packed {totalPackedCount} of {effectivePackingList.length} items
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {effectivePackingList.map((item, idx) => {
                      const isChecked = !!checkedPackingItems[item];

                      return (
                        <div
                          key={idx}
                          onClick={() => togglePackingItem(item)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "14px",
                            border: isChecked ? "1px solid #22c55e" : "1px solid var(--border-color)",
                            backgroundColor: isChecked ? "#dcfce7" : "#ffffff",
                            color: isChecked ? "#15803d" : "var(--text-primary)",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                            userSelect: "none",
                          }}
                        >
                          <span>{isChecked ? "☑" : "☐"}</span>
                          <span>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Safety-Filtered Activity Guidance */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534", marginBottom: "6px" }}>
                      ✓ Recommended Safe Activity Categories:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.8rem", color: "#14532d" }}>
                      {(weatherPlanning.safeActivityCategories?.length > 0
                        ? weatherPlanning.safeActivityCategories
                        : ["Cultural Landmarks & Covered Temples", "Tea Factory Tastings", "Local Culinary Masterclasses"]
                      ).map((cat, idx) => (
                        <li key={idx} style={{ marginBottom: "2px" }}>{cat}</li>
                      ))}
                    </ul>
                  </div>

                  {weatherPlanning.restrictedActivityCategories?.length > 0 && (
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b", marginBottom: "6px" }}>
                        ⚠️ Restricted Activities in Adverse Conditions:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.8rem", color: "#7f1d1d" }}>
                        {weatherPlanning.restrictedActivityCategories.map((cat, idx) => (
                          <li key={idx} style={{ marginBottom: "2px" }}>{cat}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* ========================================================= */}
          {/* COMPLETED TRIP SUMMARY CARD (VISIBLE FOR COMPLETED TRIPS) */}
          {/* ========================================================= */}
          {currentTrip.status === "COMPLETED" && (
            <div
              className="tw-card"
              style={{
                border: "2px solid #86efac",
                backgroundColor: "#f0fdf4",
              }}
            >
              <div className="tw-card-header">
                <div>
                  <h3 className="tw-card-title" style={{ color: "#15803d" }}>
                    <span>🏆</span> Official Trip Summary: {currentTrip.startingPlace} ➔ {currentTrip.destination}
                  </h3>
                  <span style={{ fontSize: "0.82rem", color: "#166534" }}>
                    Verified completed on {new Date(currentTrip.completedAt || Date.now()).toLocaleString()}
                  </span>
                </div>
                <span className="badge badge-success">COMPLETED</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginTop: "10px" }}>
                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0" }}>
                  <span className="kpi-label">Completion Method</span>
                  <strong style={{ color: "#15803d" }}>
                    {currentTrip.completionMethod === "LOCATION" ? "📍 GPS Live Arrival (<= 500m)" : "🏁 Manual Confirmation"}
                  </strong>
                </div>

                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0" }}>
                  <span className="kpi-label">Route Covered</span>
                  <strong>{currentTrip.estimatedDistanceKm || distanceKm} km ({currentTrip.selectedTransport || selectedTransport})</strong>
                </div>

                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0" }}>
                  <span className="kpi-label">Allocated Budget</span>
                  <strong>LKR {(currentTrip.budgetAmount || 0).toLocaleString()}</strong>
                </div>

                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0" }}>
                  <span className="kpi-label">Packing Preparation</span>
                  <strong style={{ color: "#15803d" }}>
                    {totalPackedCount} Items Packed
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Curated Recommendations for Destination Matching Onboarding Preferences */}
          <div className="tw-card">
            <div className="tw-card-header">
              <div>
                <h3 className="tw-card-title">
                  <span>✨</span> Curated Experiences for {currentTrip.destination}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Personalized by travel profile: {user?.travelStyle || "Adventure"} •{" "}
                  {Array.isArray(user?.interests) ? user.interests.join(", ") : (user?.interests || "Nature, Hiking")}
                </span>
              </div>
            </div>

            {activityFeedback && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "6px",
                  backgroundColor: activityFeedback.startsWith("✓") ? "#dcfce7" : "#eff6ff",
                  borderLeft: activityFeedback.startsWith("✓") ? "4px solid #22c55e" : "4px solid #3b82f6",
                  color: activityFeedback.startsWith("✓") ? "#15803d" : "#1e40af",
                  fontSize: "0.88rem",
                  marginBottom: "16px",
                }}
              >
                {activityFeedback}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {curatedActivities.map((act, index) => (
                <div
                  key={index}
                  style={{
                    padding: "16px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-alt)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "1rem", color: "var(--primary)" }}>{act.name}</strong>
                      <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>{act.category}</span>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4", margin: "6px 0" }}>
                      {act.description}
                    </p>

                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      📍 {act.location} • ⏱️ {act.durationMinutes} mins
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "10px" }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {act.estimatedCost > 0 ? `LKR ${act.estimatedCost.toLocaleString()}` : "Free Admission"}
                    </span>

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleAddCuratedActivity(act)}
                      title="Save this experience directly to PostgreSQL activity schedule"
                    >
                      ➕ Add to Itinerary
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CELEBRATION MODAL WITH BLOOM & ANIMATION */}
      {/* ========================================================= */}
      {showCelebrationModal && celebrationData && (
        <div className="celebration-overlay" onClick={() => setShowCelebrationModal(false)}>
          <div
            className="celebration-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confetti Decorative Dots */}
            <div className="confetti-particle" style={{ top: "12%", left: "10%", background: "#f59e0b" }}></div>
            <div className="confetti-particle" style={{ top: "18%", right: "12%", background: "#3b82f6" }}></div>
            <div className="confetti-particle" style={{ top: "45%", left: "6%", background: "#ec4899" }}></div>
            <div className="confetti-particle" style={{ top: "40%", right: "8%", background: "#10b981" }}></div>
            <div className="confetti-particle" style={{ bottom: "15%", left: "15%", background: "#8b5cf6" }}></div>
            <div className="confetti-particle" style={{ bottom: "20%", right: "14%", background: "#f97316" }}></div>

            <div style={{ fontSize: "3.5rem", marginBottom: "8px" }}>🎉</div>

            <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--primary)", margin: "0 0 8px" }}>
              Congratulations!
            </h2>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#15803d", margin: "0 0 16px" }}>
              You've reached {celebrationData.destination}!
            </h3>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5", margin: "0 0 20px" }}>
              Your travel expedition has been officially completed and recorded in TravelWise.
            </p>

            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: "var(--radius-md)",
                padding: "12px",
                border: "1px solid var(--border-color)",
                marginBottom: "24px",
                fontSize: "0.85rem",
                textAlign: "left",
              }}
            >
              <div style={{ marginBottom: "6px" }}>
                📍 <strong>Destination:</strong> {celebrationData.destination}
              </div>
              <div style={{ marginBottom: "6px" }}>
                ⏰ <strong>Arrival Time:</strong> {new Date(celebrationData.completedAt).toLocaleString()}
              </div>
              <div>
                🏷️ <strong>Completion Method:</strong>{" "}
                <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
                  {celebrationData.completionMethod === "LOCATION" ? "📍 Live Location Arrival" : "🏁 Manual Confirmation"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                type="button"
                className="auth-btn-primary"
                style={{ padding: "10px 24px" }}
                onClick={() => setShowCelebrationModal(false)}
              >
                View Trip Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MANUAL COMPLETION CONFIRMATION MODAL */}
      {/* ========================================================= */}
      {showManualConfirmModal && tripToComplete && (
        <div
          className="celebration-overlay"
          onClick={() => setShowManualConfirmModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              maxWidth: "460px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🏁</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)", margin: "0 0 8px" }}>
              Confirm Trip Completion
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0 0 20px" }}>
              Are you sure you want to mark your trip to <strong>{tripToComplete.destination}</strong> as COMPLETED? This will record the completion timestamp and mark the itinerary as accomplished.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowManualConfirmModal(false)}
                disabled={completionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="auth-btn-primary"
                style={{ padding: "8px 20px", background: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)", borderColor: "#15803d" }}
                onClick={confirmManualCompletion}
                disabled={completionLoading}
              >
                {completionLoading ? "Completing..." : "Yes, Complete Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TripManager;
