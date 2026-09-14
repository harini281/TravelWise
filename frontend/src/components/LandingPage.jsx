import { useState } from "react";
import TravelWiseLogo from "./TravelWiseLogo";

export default function LandingPage({ onGetStarted, onSignIn, onExploreApp }) {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: "🧭",
      title: "Smart Trip Planning",
      desc: "Generate full multi-day itineraries tailored to your dates, group size, and travel pace with real-world activity sequencing.",
    },
    {
      icon: "💳",
      title: "Budget Intelligence",
      desc: "Deterministic expense tracking, automated burn velocity calculations, and category caps to keep your journey stress-free.",
    },
    {
      icon: "📍",
      title: "Personalised Recommendations",
      desc: "Discover scenic landmarks, hidden gems, and local dining that match your personal interests without breaking your budget.",
    },
    {
      icon: "🛡️",
      title: "Travel Safety & Climate",
      desc: "Live Open-Meteo meteorological risk analysis, weather warnings, and multi-factor safety assessments for complete peace of mind.",
    },
    {
      icon: "📋",
      title: "Travel Readiness",
      desc: "Automated checklist scoring for identification, health, travel insurance, and bookings to ensure you are 100% departure-ready.",
    },
    {
      icon: "🤖",
      title: "Agentic AI Workflow",
      desc: "Four specialized LangGraph agents (Budget, Activity, Risk, Readiness) synthesizing recommendations with human-in-the-loop governance.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F2B48", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navigation */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "rgba(15, 43, 72, 0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <TravelWiseLogo size={32} light={true} showTagline={true} />
          </div>

          <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <a
              href="#features"
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#2DD4BF")}
              onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)")}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                transition: "color 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#2DD4BF")}
              onMouseOut={(e) => (e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)")}
            >
              About
            </a>
            <button
              type="button"
              onClick={onSignIn}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#FFFFFF",
                padding: "8px 18px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "#FFFFFF";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              style={{
                background: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
                border: "none",
                color: "#FFFFFF",
                padding: "9px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(13, 148, 136, 0.35)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              Get Started
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "85vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "80px 24px 60px",
          backgroundImage: `linear-gradient(to bottom, rgba(15, 43, 72, 0.78) 0%, rgba(15, 43, 72, 0.9) 65%, #0F2B48 100%), url('https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1920&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div style={{ maxWidth: "860px", margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              borderRadius: "9999px",
              backgroundColor: "rgba(45, 212, 191, 0.15)",
              border: "1px solid rgba(45, 212, 191, 0.35)",
              color: "#2DD4BF",
              fontSize: "0.85rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              marginBottom: "24px",
            }}
          >
            <span>✦</span> AI-Powered Travel Planning
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)",
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              marginBottom: "20px",
            }}
          >
            Plan smarter.
            <br />
            Travel safer.
            <br />
            Discover more.
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.25rem)",
              lineHeight: 1.6,
              color: "rgba(226, 232, 240, 0.9)",
              maxWidth: "680px",
              margin: "0 auto 36px",
              fontWeight: 400,
            }}
          >
            Get personalised itineraries, smart budgets, safety insights and real recommendations powered by AI.
          </p>

          {/* Action CTAs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "60px",
            }}
          >
            <button
              type="button"
              onClick={onGetStarted}
              style={{
                backgroundColor: "#0D9488",
                color: "#FFFFFF",
                border: "none",
                padding: "14px 32px",
                borderRadius: "10px",
                fontSize: "1.05rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 8px 24px rgba(13, 148, 136, 0.4)",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#0F766E";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#0D9488";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Get Started →
            </button>

            <button
              type="button"
              onClick={onExploreApp}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#FFFFFF",
                padding: "14px 28px",
                borderRadius: "10px",
                fontSize: "1.05rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.2)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.12)")}
            >
              Explore Live Demo
            </button>
          </div>

          {/* 4 Bottom Feature Highlights (matching reference mockup) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "16px",
              padding: "20px 24px",
              borderRadius: "16px",
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(12px)",
              maxWidth: "800px",
              margin: "0 auto 28px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.3rem" }}>💳</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#FFFFFF" }}>Smart Budgets</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.3rem" }}>⚡</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#FFFFFF" }}>Real-time Insights</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.3rem" }}>🗺️</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#FFFFFF" }}>Personalised Trips</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "1.3rem" }}>🛡️</span>
              <span style={{ fontSize: "0.92rem", fontWeight: 600, color: "#FFFFFF" }}>Safer Travel</span>
            </div>
          </div>

          {/* Subtitle quote */}
          <p style={{ fontStyle: "italic", fontSize: "0.9rem", color: "rgba(203, 213, 225, 0.8)" }}>
            "Not just a trip. A smarter journey."
          </p>
        </div>
      </section>

      {/* Feature Section */}
      <section
        id="features"
        style={{
          backgroundColor: "#F8FAFC",
          color: "#0F2B48",
          padding: "80px 24px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <span
              style={{
                color: "#0D9488",
                fontWeight: 700,
                fontSize: "0.88rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Intelligent Capabilities
            </span>
            <h2
              style={{
                fontSize: "2.4rem",
                fontWeight: 800,
                color: "#0F2B48",
                marginTop: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              Everything you need for seamless journeys
            </h2>
            <p style={{ color: "#64748B", fontSize: "1.1rem", maxWidth: "600px", margin: "12px auto 0" }}>
              TravelWise pairs agentic intelligence with deterministic safety guarantees to protect your time and budget.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {features.map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: "#FFFFFF",
                  padding: "32px 28px",
                  borderRadius: "16px",
                  border: "1px solid #E2E8F0",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.04)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(15, 23, 42, 0.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.04)";
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(13, 148, 136, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    marginBottom: "18px",
                  }}
                >
                  {item.icon}
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0F2B48", marginBottom: "10px" }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "#64748B", margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          backgroundColor: "#FFFFFF",
          color: "#0F2B48",
          padding: "80px 24px",
          borderTop: "1px solid #E2E8F0",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <span
            style={{
              color: "#0D9488",
              fontWeight: 700,
              fontSize: "0.88rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            How It Works
          </span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", marginBottom: "48px" }}>
            From inspiration to departure in 3 simple steps
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "32px",
              textAlign: "left",
            }}
          >
            <div style={{ padding: "20px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#0F2B48",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                1
              </div>
              <h4 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px" }}>Set Your Preferences</h4>
              <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Tell us your travel style, pace, and interests. Whether you crave hiking or cultural discovery, TravelWise adapts.
              </p>
            </div>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#0D9488",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                2
              </div>
              <h4 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px" }}>AI Agent Synthesis</h4>
              <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Our 4 specialized agents review budgets, weather risks, activity schedules, and travel requirements in parallel.
              </p>
            </div>

            <div style={{ padding: "20px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#0F2B48",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  marginBottom: "16px",
                }}
              >
                3
              </div>
              <h4 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "8px" }}>Travel with Confidence</h4>
              <p style={{ color: "#64748B", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Access interactive route maps, real-time safety scores, and verified checklists directly from any device.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "50px" }}>
            <button
              type="button"
              onClick={onGetStarted}
              style={{
                backgroundColor: "#0F2B48",
                color: "#FFFFFF",
                padding: "14px 32px",
                borderRadius: "10px",
                fontSize: "1rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Start Planning Now →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "#091E33",
          color: "rgba(255, 255, 255, 0.7)",
          padding: "40px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          <div>
            <TravelWiseLogo size={26} light={true} />
            <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.5)", marginTop: "6px" }}>
              Intelligent Travel Planning Platform • University Viva Demonstration Edition
            </p>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "0.88rem" }}>
            <button
              type="button"
              onClick={onSignIn}
              style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.7)", cursor: "pointer" }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              style={{ background: "none", border: "none", color: "#2DD4BF", cursor: "pointer", fontWeight: 600 }}
            >
              Create Account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
