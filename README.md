

TravelWise is currently under active development as part of the SE3090 Software Engineering Frameworks project.

### Implemented

- ASP.NET Core Web API backend
- PostgreSQL database integration using Entity Framework Core
- Trip management and shared trip context
- Smart Budget & Expense Management
  - Budget tracking
  - Expense CRUD operations
  - Remaining budget calculation
  - Spending percentage
  - Deterministic budget health analysis
- Experience & Activity Planning
  - Activity CRUD operations
  - Trip-date validation
  - Activity schedule validation
- Travel Safety & Risk Management
  - Open-Meteo weather API integration
  - Weather data retrieval
  - Deterministic trip risk assessment
  - Safe handling of unavailable weather data
- Travel Document & Readiness Management
  - Travel requirements
  - Readiness checklist
  - Deterministic readiness assessment
- React web application connected to the ASP.NET Core API
- Flutter application connected to the same ASP.NET Core API
- AI workflow persistence
- Human approval workflow
- Specialized AI components for:
  - Budget
  - Activities
  - Risk
  - Travel readiness
- LangGraph-based workflow/orchestration structure
- Workflow validation and approval states

### Current Architecture

The client applications do not access the database directly.

```text
React Web App ─────┐
                   │
Flutter App ───────┤
                   ▼
            ASP.NET Core API
                   │
          ┌────────┴────────┐
          ▼                 ▼
     PostgreSQL       Agentic AI Service
                       (FastAPI/Python)
                              │
                         Orchestrator
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        Budget Agent     Activity Agent    Risk Agent
                                               │
                                      Readiness Agent
