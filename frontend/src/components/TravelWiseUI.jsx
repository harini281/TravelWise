import { apiFetch as fetch } from "../apiClient";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

export function Icon({ name = "compass", size = 20 }) {
  const paths = {
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m16 8-3 5-5 3 3-5Z" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    budget: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18m-6 4h3" />
      </>
    ),
    activities: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3" />
      </>
    ),
    safety: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.compass}
    </svg>
  );
}
export function PrimaryButton({ children, ...props }) {
  return (
    <button type="button" className="btn btn-primary" {...props}>
      {children}
    </button>
  );
}
export function SecondaryButton({ children, ...props }) {
  return (
    <button type="button" className="btn btn-outline" {...props}>
      {children}
    </button>
  );
}
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="tw-page-heading">
      <div>
        <p className="tw-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="tw-actions">{children}</div>}
    </header>
  );
}
export function SectionCard({
  title,
  eyebrow,
  children,
  className = "",
  action,
}) {
  return (
    <section className={`tw-section-card ${className}`}>
      <header>
        <div>
          {eyebrow && <p className="tw-eyebrow">{eyebrow}</p>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
export function StatusBadge({ children, tone = "neutral" }) {
  return (
    <span className={`tw-status tw-status-${tone}`}>
      {String(children || "Not available").replaceAll("_", " ")}
    </span>
  );
}
export function StatCard({ label, value, detail, tone, onClick }) {
  return (
    <section className="tw-stat-card">
      <p className="tw-eyebrow">{label}</p>
      <strong className={tone ? `tw-text-${tone}` : ""}>
        {value ?? "Not available"}
      </strong>
      <p>{detail}</p>
      {onClick && (
        <button className="tw-text-button" onClick={onClick}>
          View details <Icon name="arrow" size={16} />
        </button>
      )}
    </section>
  );
}
export function LoadingState({ label = "Loading your journey…" }) {
  return (
    <div className="tw-state" role="status">
      <span className="tw-loading-ring" />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className="tw-state tw-error" role="alert">
      <h2>We couldn’t load this view</h2>
      <p>{message}</p>
      {onRetry && (
        <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>
      )}
    </div>
  );
}
export function EmptyState({ onExplore, onPlan }) {
  return (
    <section className="tw-empty-state">
      <div className="tw-orbit" aria-hidden="true">
        <Icon size={70} />
      </div>
      <p className="tw-eyebrow">A little intention. A world of possibility.</p>
      <h1>Where will you go next?</h1>
      <p>
        Bring your route, budget, and experiences together.
        <br />
        Your next chapter starts with a destination.
      </p>
      <div className="tw-actions">
        <PrimaryButton onClick={onPlan}>
          Plan Your First Trip <Icon name="arrow" size={18} />
        </PrimaryButton>
        <SecondaryButton onClick={onExplore}>
          Explore Destinations
        </SecondaryButton>
      </div>
      <div className="tw-empty-footnote">
        <span>Find your direction</span>
        <span>Make room for discovery</span>
        <span>Travel with confidence</span>
      </div>
    </section>
  );
}
export function FormField({ label, children, hint }) {
  return (
    <label className="tw-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function DestinationVisual({ query, className = "", children }) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    setPhoto(null);
    if (!query) return;
    const controller = new AbortController();
    fetch(
      `${API_BASE_URL}/api/Destinations/photo?query=${encodeURIComponent(query.slice(0, 100))}`,
      { signal: controller.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) setPhoto(data?.photo || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [query]);
  return (
    <div className={`tw-destination-visual ${className}`}>
      {photo && (
        <img
          src={photo.url}
          alt={photo.alt || `Travel photograph for ${query}`}
          onError={() => setPhoto(null)}
        />
      )}
      <div className="tw-visual-overlay" />
      {children}
      {photo && (
        <small className="tw-photo-credit">
          Photo by{" "}
          <a href={photo.profileUrl} target="_blank" rel="noreferrer">
            {photo.photographer}
          </a>{" "}
          on{" "}
          <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
            Unsplash
          </a>
        </small>
      )}
    </div>
  );
}
export function WorkflowTimeline({ workflow }) {
  const steps = [
    [
      "Plan generated",
      !!workflow &&
        (workflow.validationPassed ||
          [
            "AWAITING_APPROVAL",
            "COMPLETED",
            "REJECTED",
            "REVISION_REQUIRED",
          ].includes(workflow.status)),
    ],
    ["Deterministic validation", workflow?.validationPassed === true],
    ["Admin verification", workflow?.approvalStatus === "APPROVED"],
  ];
  return (
    <ol className="tw-workflow">
      {steps.map(([label, passed], i) => (
        <li key={label} className={passed ? "is-complete" : ""}>
          <span>{passed ? "✓" : String(i + 1).padStart(2, "0")}</span>
          <div>
            <strong>{label}</strong>
            <small>{passed ? "Recorded" : "Not recorded"}</small>
          </div>
        </li>
      ))}
    </ol>
  );
}
