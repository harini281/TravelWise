# TravelWise — Academic AI Disclosure & Engineering Transparency

**Module**: SE3090 Software Engineering Frameworks  
**Project**: TravelWise  
**Author**: Ravichandran Harini  

---

## 1. Statement of Academic Integrity

This document outlines the architectural role and development usage of Artificial Intelligence (AI) and Machine Learning techniques within the TravelWise university project, adhering to university guidelines for ethical AI integration and software transparency.

---

## 2. Distinction: AI in the Product vs. AI in Development

### A. AI as a Core System Feature (In-Product AI)
TravelWise incorporates an **Agentic Artificial Intelligence Microservice** as part of its technical architecture. This is a deliberate software engineering design choice:
- **Framework**: Python FastAPI microservice utilizing **LangGraph** (StateGraph) for deterministic multi-agent state machines.
- **Specialized Agents**:
  1. **Budget Agent**: Reviews financial health and spending velocity.
  2. **Activity Agent**: Validates itinerary scheduling and location routing.
  3. **Risk Agent**: Synthesizes weather metrics into actionable safety advice.
  4. **Readiness Agent**: Tracks pre-departure compliance and documentation.
- **Safety Invariants & Hallucination Prevention**:
  Generative models are constrained by strict deterministic validation rules. No agent can make final decisions on approvals or financial expenditures without passing programmatic post-run invariant validation and human-in-the-loop reviewer sign-off.

### B. AI Assisted Tooling in Development
In accordance with modern software engineering best practices:
- AI coding assistants were utilized as interactive pair-programming tools for code scaffolding, repetitive DTO generation, unit test case boilerplate, and documentation drafting.
- **Verification & Ownership**: All architectural decisions, database schemas, business rules, and security configurations were reviewed, debugged, executed, and verified by the student.
- Every commit was validated locally and on continuous integration runners through automated test suites:
  - ASP.NET Core xUnit deterministic validation suite (8/8 passed)
  - Python Pytest golden-case suite (3/3 passed)
  - Flutter widget and model test suite (3/3 passed)
  - Static analysis (`flutter analyze` with 0 issues)

---

## 3. Engineering Justifications for Architecture Decisions

| Design Choice | Rationale |
| :--- | :--- |
| **Microservice Isolation for AI** | Separating the Python LangGraph engine from the ASP.NET Core API ensures that heavy AI computations never block user transactions or degrade core REST API response times. |
| **Deterministic Fallback Engine** | AI models and external APIs may experience transient outages. A fallback to seasonal meteorological baselines guarantees the system never produces HTTP 500/503 errors. |
| **Human Approval Workflow** | Autonomous AI actions introduce unpredictability. TravelWise enforces human reviewer approval before any AI-generated itinerary transitions to `APPROVED`. |
| **Single API Entry Point** | Routing both React and Flutter clients through ASP.NET Core enforces centralized authentication (JWT), authorization (RBAC), and transactional integrity. |
