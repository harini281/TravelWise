export default function TravelWiseLogo({ size = 28, light = false, showTagline = false }) {
  const primaryColor = light ? "#FFFFFF" : "#0F2B48";
  const accentColor = "#0D9488";
  const textColor = light ? "#FFFFFF" : "#0F2B48";
  const mutedColor = light ? "rgba(255, 255, 255, 0.75)" : "#64748B";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left mountain peak */}
        <polygon points="3,26 14,7 21,19 17,26" fill={primaryColor} />
        <polygon points="14,7 21,19 16,26 10,26" fill={accentColor} opacity="0.9" />
        {/* Right connected mountain peak */}
        <polygon points="17,26 23,13 29,26" fill={primaryColor} opacity="0.85" />
        <polygon points="23,13 29,26 25,26" fill={accentColor} opacity="0.75" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: size >= 32 ? "1.4rem" : "1.2rem",
            letterSpacing: "-0.02em",
            color: textColor,
          }}
        >
          TravelWise
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: mutedColor,
              marginTop: "2px",
            }}
          >
            Travel Smarter. Go Further.
          </span>
        )}
      </div>
    </div>
  );
}
