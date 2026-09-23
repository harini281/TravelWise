import DestinationExplorer from "./DestinationExplorer";
import TravelWiseLogo from "./TravelWiseLogo";
import "./LandingPage.css";

const featuredDestinations = [
  {
    name: "Ella",
    country: "Sri Lanka",
    tag: "Highland Escapes",
    desc: "Scenic rail viaducts, emerald tea terraces, and misty mountain horizons.",
    image: "https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Kyoto",
    country: "Japan",
    tag: "Cultural Heritage",
    desc: "Centuries-old wooden shrines, bamboo groves, and tranquil moss gardens.",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Amalfi Coast",
    country: "Italy",
    tag: "Coastal Wonders",
    desc: "Dramatic sea cliffs, pastel fishing hamlets, and warm Mediterranean breezes.",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Swiss Alps",
    country: "Switzerland",
    tag: "Mountain Treks",
    desc: "Pristine alpine lakes, world-class panoramic trails, and crisp high peaks.",
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Cape Town",
    country: "South Africa",
    tag: "Atlantic Horizons",
    desc: "Bold mountain backdrops, pristine coastlines, and historic harbor districts.",
    image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Banff",
    country: "Canada",
    tag: "Wilderness Sanctuaries",
    desc: "Turquoise glacial lakes, sweeping pine valleys, and protected national parks.",
    image: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=900&q=80",
  },
];

const howItWorks = [
  {
    num: "01",
    title: "Smart Trip Planning",
    desc: "Build a practical itinerary around your dates, pace, and interests with clear timelines.",
  },
  {
    num: "02",
    title: "Budget Management",
    desc: "Track daily spend, food allowances, and an untouchable return transit reserve.",
  },
  {
    num: "03",
    title: "Weather Guidance",
    desc: "Live Open-Meteo forecasts, atmospheric risk scoring, and date-window assessments.",
  },
  {
    num: "04",
    title: "Transport & Routes",
    desc: "Clear transfers, transit timing, and reachable area calculations via Geoapify.",
  },
  {
    num: "05",
    title: "Safety & Readiness",
    desc: "Deterministic safety checks, emergency points of contact, and packing lists.",
  },
  {
    num: "06",
    title: "Accommodation Discovery",
    desc: "Explore worldwide stays with walk scores, transit links, and one-click itinerary saving.",
  },
];

const planningPillars = [
  {
    icon: "💰",
    title: "Safe-to-Spend Budgeting",
    desc: "Automatic budget math protects your journey home. Daily expense tracking ensures you never run short.",
  },
  {
    icon: "🌦️",
    title: "Atmospheric Intelligence",
    desc: "Deterministic meteorological scoring detects rain, storms, or extremes and suggests safer alternate windows.",
  },
  {
    icon: "🏨",
    title: "Curated Accommodations",
    desc: "Filter by room types, price per night, walkability, and neighborhood accessibility worldwide.",
  },
  {
    icon: "🎒",
    title: "Complete Journey Readiness",
    desc: "Interactive travel checklists verify documents, health requirements, and essential pack items.",
  },
];

const journeySteps = [
  "Plan Trip",
  "Check Route",
  "Check Weather",
  "Manage Budget",
  "Build Itinerary",
  "Travel",
  "Reach Destination",
  "Plan Return",
  "Complete Trip",
];

export default function LandingPage({ onGetStarted, onSignIn, onPlanDestination }) {
  return (
    <main className="landing-page">
      {/* 1. Navigation */}
      <header className="landing-nav">
        <a href="#top" aria-label="TravelWise home" className="landing-logo-link">
          <TravelWiseLogo size={32} light showTagline />
        </a>
        <nav className="landing-nav-links">
          <a href="#featured">Destinations</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#planning">Planning</a>
          <a href="#explore">Explore</a>
          <button type="button" className="landing-nav-signin" onClick={onSignIn}>
            Sign In
          </button>
          <button type="button" className="landing-nav-cta" onClick={onGetStarted}>
            Plan Your Trip
          </button>
        </nav>
      </header>

      {/* 2. Hero Section: Cinematic Image-Led Travel Hero */}
      <section className="landing-hero" id="top">
        <div className="landing-hero-container">
          <p className="landing-kicker">TravelWise</p>
          <h1 className="landing-hero-title">
            Plan journeys around<br />
            what matters to you.
          </h1>
          <p className="landing-hero-subtitle">
            Intelligent planning for budget, experiences, safety and readiness.
          </p>
          <div className="landing-actions">
            <button type="button" className="landing-primary" onClick={onGetStarted}>
              Plan Your Trip <span>→</span>
            </button>
            <a className="landing-ghost" href="#featured">
              Explore Destinations <span>↓</span>
            </a>
          </div>
          <div className="landing-hero-trust">
            <span>● Built for the whole journey</span>
            <span className="divider">|</span>
            <span>Local and international trips</span>
            <span className="divider">|</span>
            <span>Live telemetry</span>
          </div>
        </div>
      </section>

      {/* 3. Section 1: Warm Neutral Section — Curated Destination Cards */}
      <section className="landing-section landing-featured" id="featured">
        <div className="landing-heading">
          <div>
            <p className="landing-kicker dark">Curated Inspiration</p>
            <h2>Destination Inspiration</h2>
          </div>
          <p>
            Explore popular travel hubs ready for immediate itinerary, budget, and accommodation discovery.
          </p>
        </div>
        <div className="landing-places-grid">
          {featuredDestinations.map((dest) => (
            <article
              key={dest.name}
              className="landing-place-card"
              style={{ backgroundImage: `url('${dest.image}')` }}
            >
              <div className="landing-place-overlay" />
              <div className="landing-place-content">
                <span className="landing-place-tag">{dest.tag}</span>
                <h3>{dest.name}</h3>
                <p className="landing-place-country">{dest.country}</p>
                <p className="landing-place-desc">{dest.desc}</p>
                <button
                  type="button"
                  className="landing-place-action"
                  onClick={() =>
                    onPlanDestination
                      ? onPlanDestination({ name: dest.name, country: dest.country })
                      : onGetStarted()
                  }
                >
                  Plan this trip <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. Section 2: Soft Blue-Grey Section — How TravelWise Works */}
      <section className="landing-section landing-how-it-works" id="how-it-works">
        <div className="landing-heading">
          <div>
            <p className="landing-kicker dark">The Connected Approach</p>
            <h2>How TravelWise Works</h2>
          </div>
          <p>
            Practical tools unified in one calm, connected platform so you travel with complete confidence.
          </p>
        </div>
        <div className="landing-how-grid">
          {howItWorks.map((item) => (
            <article key={item.num} className="landing-how-card">
              <span className="landing-how-num">{item.num}</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Section 3: White / Ivory Section — Personalized Travel Planning */}
      <section className="landing-section landing-planning" id="planning">
        <div className="landing-heading">
          <div>
            <p className="landing-kicker dark">Intelligent Capabilities</p>
            <h2>Personalized Travel Planning</h2>
          </div>
          <p>
            Every decision backed by deterministic calculations, live atmospheric telemetry, and verified stays.
          </p>
        </div>
        <div className="landing-pillars-grid">
          {planningPillars.map((pillar) => (
            <article key={pillar.title} className="landing-pillar-card">
              <span className="landing-pillar-icon">{pillar.icon}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 6. Section 4: Image-Led Section — Explore Destinations */}
      <section className="landing-section landing-explore" id="explore">
        <DestinationExplorer onPlan={onPlanDestination || onGetStarted} />
      </section>

      {/* 7. Section 5: Dark Navy Section ONLY Selectively for Contrast */}
      <section className="landing-journey" id="journey">
        <div className="landing-journey-intro">
          <p className="landing-kicker">One connected journey</p>
          <h2>
            From first idea<br />
            <em>to home again.</em>
          </h2>
          <p>
            Plans change. TravelWise keeps up, with a clear view of every step and certainty for the next.
          </p>
          <button type="button" className="landing-primary" onClick={onGetStarted}>
            Begin planning <span>→</span>
          </button>
        </div>
        <div className="landing-steps">
          {journeySteps.map((step, index) => (
            <div key={step} className="landing-step-item">
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{step}</strong>
              {index < journeySteps.length - 1 && <span className="landing-step-arrow">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <TravelWiseLogo size={28} light showTagline />
          <p>Intelligent, calm planning for wherever you are going next.</p>
        </div>
        <div className="landing-footer-links">
          <a href="#featured">Destinations</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#explore">Live Search</a>
        </div>
        <div className="landing-footer-actions">
          <button type="button" className="landing-footer-btn" onClick={onSignIn}>
            Sign In
          </button>
          <button type="button" className="landing-footer-btn cta" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </footer>
    </main>
  );
}
