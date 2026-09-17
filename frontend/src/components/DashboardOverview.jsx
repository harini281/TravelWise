import { apiFetch as fetch } from "../apiClient";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";
import {
  DestinationVisual,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  StatCard,
  StatusBadge,
  WorkflowTimeline,
} from "./TravelWiseUI";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(value);
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Dates not set";
const stamp = (value) =>
  value ? new Date(value).toLocaleString() : "Time unavailable";

export default function DashboardOverview({ trip, user, onNavigate }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setSnapshot(null);
    setError("");
    if (!trip?.id) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${API_BASE_URL}/api/Dashboard/trip/${trip.id}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Your trip summary is unavailable. Your saved plan has not changed.",
          );
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [trip?.id, user.token, revision]);

  if (!trip)
    return (
      <EmptyState
        onExplore={() => onNavigate("explore")}
        onPlan={() => onNavigate("trip")}
      />
    );
  const data = snapshot?.trip.id === trip.id ? snapshot : null;
  const nextActivity = data?.activities.find(
    (a) =>
      !["CANCELLED", "COMPLETED"].includes(a.status) &&
      new Date(a.scheduledEnd) >= new Date(),
  );
  const budget = data?.budget;
  const checks = data
    ? [
        [
          "Route and dates",
          Boolean(
            trip.startingPlace &&
            trip.destination &&
            trip.startDate &&
            trip.returnDate,
          ),
          "trip",
        ],
        ["Budget set", budget.allocated > 0, "budget"],
        [
          "Itinerary started",
          data.activities.some((a) => a.status !== "CANCELLED"),
          "activities",
        ],
        [
          "Required preparation",
          data.readiness.total > 0 &&
            data.readiness.completed === data.readiness.total,
          "readiness",
        ],
        [
          "Plan verified",
          data.workflow?.approvalStatus === "APPROVED",
          "ai_planner",
        ],
      ]
    : [];
  const progress = checks.filter(([, checked]) => checked).length;
  let interests = user?.interests || [];
  if (typeof interests === "string") {
    try {
      interests = JSON.parse(interests);
    } catch {
      interests = interests.split(",");
    }
  }
  if (!Array.isArray(interests)) interests = [];
  const recommendations =
    data?.activities
      .filter(
        (a) =>
          a.status !== "CANCELLED" &&
          a.status !== "COMPLETED" &&
          interests.some((interest) =>
            `${a.category} ${a.name}`
              .toLowerCase()
              .includes(String(interest).trim().toLowerCase()),
          ),
      )
      .slice(0, 3) || [];
  const workflow = data?.workflow;
  return (
    <div className="tw-dashboard">
      <PageHeader
        eyebrow="Your travel command centre"
        title={`Welcome${user.fullName || user.username ? `, ${(user.fullName || user.username).split(" ")[0]}` : " back"}.`}
        description="A clear view of your journey, with room for what comes next."
      >
        <SecondaryButton onClick={() => onNavigate("explore")}>
          Explore destinations
        </SecondaryButton>
      </PageHeader>
      <DestinationVisual query={trip.destination} className="tw-trip-hero">
        <div className="tw-trip-hero-content">
          <div className="tw-actions">
            <span className="tw-eyebrow">YOUR SELECTED JOURNEY</span>
            <StatusBadge tone="teal">{trip.status}</StatusBadge>
          </div>
          <h2>{trip.destination}</h2>
          <p className="tw-trip-route">
            {trip.startingPlace || "Starting place not set"}{" "}
            <span aria-hidden="true">⟶</span> {trip.destination}
          </p>
          <div className="tw-trip-facts">
            <span>
              {date(trip.startDate)} — {date(trip.returnDate)}
            </span>
            <span>
              {trip.travellerCount}{" "}
              {trip.travellerCount === 1 ? "traveller" : "travellers"}
            </span>
            {trip.tripType && <span>{trip.tripType}</span>}
          </div>
          <PrimaryButton onClick={() => onNavigate("trip")}>
            Open your trip →
          </PrimaryButton>
        </div>
        {data && (
          <div className="tw-hero-progress">
            <span className="tw-eyebrow">PLANNING PROGRESS</span>
            <strong>
              {progress}
              <small> / {checks.length}</small>
            </strong>
            <p>planning steps recorded</p>
            <progress
              value={progress}
              max={checks.length}
              aria-label="Planning steps recorded"
            />
          </div>
        )}
      </DestinationVisual>
      {loading && <LoadingState />}
      {error && (
        <ErrorState message={error} onRetry={() => setRevision((r) => r + 1)} />
      )}
      {data && (
        <>
          <div className="tw-stat-grid">
            <StatCard
              label="Budget health"
              value={
                budget.health === "UNSET"
                  ? "Budget not set"
                  : budget.health.toLowerCase()
              }
              tone={budget.health === "HEALTHY" ? "teal" : "warning"}
              detail={
                budget.allocated > 0
                  ? `${money(budget.spent)} recorded of ${money(budget.allocated)}`
                  : "Set a budget to track your spending."
              }
              onClick={() => onNavigate("budget")}
            />
            <StatCard
              label="Safe to spend"
              value={
                budget.allocated > 0
                  ? money(budget.safeToSpend)
                  : "Not calculated"
              }
              detail={
                budget.allocated > 0
                  ? "After recorded expenses, remaining food allowance, and return reserve. Other future costs may still apply."
                  : "Available after you set a trip budget."
              }
              onClick={() => onNavigate("budget")}
            />
            <StatCard
              label="Next activity"
              value={nextActivity?.name || "Nothing scheduled ahead"}
              detail={
                nextActivity
                  ? `${stamp(nextActivity.scheduledStart)} · ${nextActivity.location}`
                  : "Add an experience to your itinerary."
              }
              onClick={() => onNavigate("activities")}
            />
          </div>
          <div className="tw-dashboard-columns">
            <SectionCard eyebrow="One step at a time" title="Trip progress">
              <ul className="tw-checklist">
                {checks.map(([label, checked, tab]) => (
                  <li key={label}>
                    <span className={checked ? "tw-check checked" : "tw-check"}>
                      {checked ? "✓" : "·"}
                    </span>
                    <span>{label}</span>
                    <button
                      className="tw-text-button"
                      onClick={() => onNavigate(tab)}
                    >
                      {checked ? "Review" : "Continue"} →
                    </button>
                  </li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard
              eyebrow="From your saved plan"
              title="Planning workflow"
              action={
                <StatusBadge>{workflow?.status || "Not started"}</StatusBadge>
              }
            >
              <WorkflowTimeline workflow={workflow} />
              {workflow?.approvalComment && (
                <p className="tw-review-note">
                  Reviewer: {workflow.approvalComment}
                </p>
              )}
              <SecondaryButton onClick={() => onNavigate("ai_planner")}>
                {workflow ? "Review your plan" : "Start AI planning"}
              </SecondaryButton>
            </SectionCard>
          </div>
          <div className="tw-stat-grid">
            <StatCard
              label="Weather"
              value={
                data.weather?.isAvailable
                  ? `${data.weather.temperatureC}°C`
                  : "Not available"
              }
              detail={
                data.weather?.isAvailable
                  ? `${data.weather.windSpeedKph} km/h wind · Saved ${stamp(data.weather.retrievedAt)}. Check Safety for current conditions.`
                  : "Open Safety to request current conditions."
              }
              onClick={() => onNavigate("safety")}
            />
            <StatCard
              label="Safety risk"
              value={data.risk?.riskLevel || "Not assessed"}
              detail={
                data.risk
                  ? `${data.risk.summary} · Assessed ${stamp(data.risk.assessedAt)}`
                  : "Run an assessment before making travel decisions."
              }
              onClick={() => onNavigate("safety")}
            />
            <StatCard
              label="Readiness"
              value={
                data.readiness.total
                  ? `${data.readiness.completed} / ${data.readiness.total}`
                  : "Checklist not set"
              }
              detail={
                data.readiness.total
                  ? "Required items marked complete in your checklist."
                  : "Add your travel requirements to start preparing."
              }
              onClick={() => onNavigate("readiness")}
            />
          </div>
          <SectionCard
            eyebrow="Make it your journey"
            title="Personalized recommendations"
            action={<StatusBadge>From your itinerary</StatusBadge>}
          >
            {recommendations.length ? (
              <div className="tw-recommendation-grid">
                {recommendations.map((a) => (
                  <article className="tw-recommendation" key={a.id}>
                    <p className="tw-eyebrow">{a.category}</p>
                    <h3>{a.name}</h3>
                    <p>{a.location}</p>
                    <small>Matches your saved interests</small>
                    <button
                      className="tw-text-button"
                      onClick={() => onNavigate("activities")}
                    >
                      Review activity →
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="tw-inline-empty">
                <p>
                  {interests.length
                    ? "No planned activities match your saved interests yet. Add experiences to build your itinerary."
                    : "Save your interests to highlight matching activities in your itinerary."}
                </p>
                <SecondaryButton
                  onClick={() =>
                    onNavigate(interests.length ? "activities" : "profile")
                  }
                >
                  {interests.length
                    ? "Plan an activity"
                    : "Set your preferences"}
                </SecondaryButton>
              </div>
            )}
          </SectionCard>
          <p className="tw-provider-note">
            Saved trip data · Updated {stamp(data.capturedAt)}{" "}
            <button
              className="tw-text-button"
              onClick={() => setRevision((r) => r + 1)}
            >
              Refresh
            </button>
          </p>
        </>
      )}
    </div>
  );
}
