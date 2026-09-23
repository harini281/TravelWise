import React, { useEffect, useRef, useState } from "react";

export default function TripCelebrationModal({
  trip,
  onClose,
  onPlanAnother,
  onExploreDestinations,
}) {
  const canvasRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let startTime = Date.now();
    const durationMs = 3500; // Tasteful 3.5-second animation then finishes

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Tasteful travel palette colors: Travel blue, warm gold, sky blue, emerald, white
    const colors = ["#2563eb", "#38bdf8", "#f59e0b", "#10b981", "#ffffff", "#93c5fd"];
    const particleCount = 65; // Moderate, tasteful count
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 10,
        size: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 6,
        alpha: 1,
      });
    }

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > durationMs) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return; // Finished automatically
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const remainingProgress = 1 - elapsed / durationMs;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gentle gravity
        p.rotation += p.rotationSpeed;
        p.alpha = Math.min(1, remainingProgress * 1.5);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [prefersReducedMotion]);

  if (!trip) return null;

  const destination = trip.destination || "your destination";

  const formatDate = (val) => {
    if (!val) return "Not set";
    try {
      return new Date(val).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(val).slice(0, 10);
    }
  };

  const calculateDays = () => {
    if (!trip.startDate || !trip.returnDate) return null;
    try {
      const s = new Date(trip.startDate);
      const r = new Date(trip.returnDate);
      const diff = Math.round((r - s) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : 1;
    } catch {
      return null;
    }
  };

  const days = calculateDays();

  return (
    <div
      className="tw-celebration-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      {/* Particle Canvas */}
      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10000,
          }}
        />
      )}

      {/* Celebration Modal Card */}
      <div
        className="tw-celebration-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 10001,
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "var(--bg-surface, #ffffff)",
          borderRadius: "20px",
          padding: "clamp(28px, 4vw, 40px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          border: "1px solid var(--border-color, #e2e8f0)",
          textAlign: "center",
          animation: prefersReducedMotion ? "none" : "twModalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close celebration"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            color: "var(--text-muted, #94a3b8)",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          ✕
        </button>

        {/* Hero badge */}
        <div
          style={{
            width: "68px",
            height: "68px",
            borderRadius: "50%",
            backgroundColor: "#eff6ff",
            color: "#2563eb",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            marginBottom: "16px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
          }}
        >
          🎉
        </div>

        <span
          style={{
            display: "block",
            color: "#2563eb",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "6px",
          }}
        >
          Accomplished Itinerary
        </span>

        <h2
          style={{
            fontFamily: "var(--font-serif, serif)",
            fontSize: "clamp(1.8rem, 3vw, 2.2rem)",
            fontWeight: 700,
            color: "var(--ink, #0f172a)",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          Journey complete 🎉
        </h2>

        <p
          style={{
            fontSize: "1.08rem",
            fontWeight: 600,
            color: "#1e293b",
            margin: "0 0 4px",
          }}
        >
          You completed your journey to <strong style={{ color: "#2563eb" }}>{destination}</strong>.
        </p>

        <p
          style={{
            fontSize: "0.92rem",
            color: "var(--text-secondary, #64748b)",
            fontStyle: "italic",
            margin: "0 0 24px",
          }}
        >
          Another journey, another story.
        </p>

        {/* Real Stored Data Summary Box */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "16px 20px",
            textAlign: "left",
            marginBottom: "28px",
            fontSize: "0.9rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #edf2f7", paddingBottom: "8px" }}>
            <span style={{ color: "#64748b" }}>Destination</span>
            <strong style={{ color: "#0f172a" }}>{destination}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #edf2f7", paddingBottom: "8px" }}>
            <span style={{ color: "#64748b" }}>Travel Dates</span>
            <strong style={{ color: "#0f172a" }}>
              {formatDate(trip.startDate)} — {formatDate(trip.returnDate)}
            </strong>
          </div>

          {days && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #edf2f7", paddingBottom: "8px" }}>
              <span style={{ color: "#64748b" }}>Duration</span>
              <strong style={{ color: "#0f172a" }}>{days}-day journey completed</strong>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", borderBottom: "1px solid #edf2f7", paddingBottom: "8px" }}>
            <span style={{ color: "#64748b" }}>Travellers</span>
            <strong style={{ color: "#0f172a" }}>
              {trip.travellerCount || 1} {trip.travellerCount === 1 ? "traveller" : "travellers"}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#64748b" }}>Status</span>
            <span
              style={{
                backgroundColor: "#dcfce7",
                color: "#15803d",
                fontWeight: 700,
                fontSize: "0.75rem",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              ✓ COMPLETED
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{
              padding: "12px 20px",
              fontSize: "0.98rem",
              fontWeight: 700,
              width: "100%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            View Trip Summary
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            {onPlanAnother && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onPlanAnother();
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Plan Another Trip
              </button>
            )}

            {onExploreDestinations && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onExploreDestinations();
                }}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Explore Destinations
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
