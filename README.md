# TravelWise — Intelligent Travel Planning Platform

TravelWise is a full-stack travel planning platform built for SE3090 – Software Engineering Frameworks. The repository combines a React web client, Flutter client, ASP.NET Core Web API, PostgreSQL persistence, external travel-data integrations, and a Python/FastAPI LangGraph workflow service.

The implementation is organized around four primary business components: Smart Budget & Expense Management, Experience & Activity Planning, Travel Safety & Risk Management, and Travel Document & Readiness Management.

## Project Overview

TravelWise provides a shared trip context through which travellers can manage trip details, spending, activities, safety information, and pre-travel readiness. React and Flutter communicate through the ASP.NET Core API. The API persists application data with Entity Framework Core and PostgreSQL and is also the integration boundary for the internal Python workflow service.

## Business Components

### Smart Budget & Expense Management

The budget component provides budget and expense operations through the ASP.NET Core backend and persisted data model. The implementation includes budget tracking, expenses, remaining-spend calculations, category-related budget data, and deterministic budget-health evaluation.

The corresponding Python **Budget Agent** consumes trusted workflow context or calls controlled budget tools. Its current implementation calculates total budget, total spent, remaining budget, spending percentage and a health classification, then returns a structured recommendation.

### Experience & Activity Planning

The activity component provides trip activity operations and schedule-related validation. Activities are associated with trips and the backend contains validation for trip-date boundaries and schedule conflicts.

The corresponding **Activity Agent** consumes activity context or retrieves activities through its controlled tool. It returns a structured summary of the current activity plan and a recommendation to review schedule, cost, duration and conflicts.

### Travel Safety & Risk Management

The risk component integrates weather information into trip safety assessment. The backend contains an Open-Meteo integration and deterministic risk processing.

The corresponding **Risk Agent** consumes risk context or invokes its controlled risk-assessment tool. It returns a structured risk score, risk level, summary and recommendation.

### Travel Document & Readiness Management

The readiness component manages travel-preparation requirements and readiness information. The backend includes readiness persistence and deterministic readiness assessment.

The corresponding **Readiness Agent** consumes readiness context or invokes its controlled readiness tool. It returns a structured readiness score, readiness level, summary and recommendation.

## Stakeholders and User Roles

The authentication implementation currently establishes **Traveller** as the role assigned through public registration. The repository also contains **Reviewer** and **Admin** authorization concepts for governance and approval operations.

Traveller preferences are persisted through the authenticated profile/preferences API. The current profile model includes travel style, interests, budget style, activity pace and transport preference.

Host and Service Provider are not documented here as implemented user roles because repository evidence reviewed for this README did not establish complete Host or Service Provider authentication, permissions and role-specific workflows.

## System Architecture

```text
React Web Client ─────┐
                      │
Flutter Client ───────┤
                      ▼
               ASP.NET Core API
                 /           \
                ▼             ▼
          PostgreSQL     Internal AI Service
                         FastAPI + LangGraph
                                │
                         Central Orchestrator
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
        Budget Agent      Activity Agent       Risk Agent
                                                    │
                                              Readiness Agent
```

The four domain agents are specialist workflow components. The central orchestrator coordinates them; it is not described as a fifth specialist agent.

Clients are intended to use ASP.NET Core as the application entry point rather than directly accessing PostgreSQL or the internal Python service.

## Technology Stack

| Area | Technology |
| --- | --- |
| Backend | ASP.NET Core / .NET 8 |
| Data access | Entity Framework Core |
| Database | PostgreSQL |
| Web | React + Vite |
| Mobile / cross-platform | Flutter |
| Internal workflow service | Python + FastAPI |
| Orchestration | LangGraph |
| Validation schemas | Pydantic |
| HTTP integration | httpx / ASP.NET HttpClient |
| Weather | Open-Meteo |
| Place/accommodation integration | Geoapify |
| Mapping | Leaflet |
| CI | GitHub Actions |

## Agentic Workflow Architecture

The Python service defines four specialist workflow nodes:

- **Budget Agent** — budget and spending analysis.
- **Activity Agent** — activity-plan analysis.
- **Risk Agent** — risk and weather-related analysis.
- **Readiness Agent** — preparation/readiness analysis.

The LangGraph orchestrator builds a workflow with planning, the four specialist nodes, finalization and deterministic validation. Requested capabilities determine whether an individual specialist performs work, while the graph itself follows a fixed sequential node order.

```text
START
  ↓
Plan requested capabilities
  ↓
Budget Agent
  ↓
Activity Agent
  ↓
Risk Agent
  ↓
Readiness Agent
  ↓
Finalize
  ↓
Deterministic Validation
  ↓
END
```

The workflow maintains structured state including trip/user context, requested capabilities, agent tasks/results, validation information, workflow status and errors.

### Controlled Agent Tools

The repository contains separate controlled tool modules for budget, activity, risk and readiness. These tools provide the workflow service with application information without making the specialist-agent code responsible for PostgreSQL persistence.

### Deterministic Validation and Safe Failure

The workflow includes a deterministic validation stage after specialist execution. If requested specialist results are missing or unsuccessful, finalization can move the workflow to a safe-failure state rather than presenting an incomplete result as successful.

### Human-in-the-Loop Governance

Workflow state and approval information are persisted through the ASP.NET Core application. Approval operations are role-restricted where authorization is applied, allowing human governance to remain separate from specialist recommendations.

## Current AI Implementation Boundary

The current Python dependency list contains FastAPI, Pydantic, LangGraph, httpx and pytest. The four inspected specialist implementations use deterministic Python logic and controlled tool calls to generate their current analyses and recommendations.

No direct Gemini, OpenAI, Anthropic, Azure OpenAI or other LLM invocation was verified in the inspected current AI-service implementation. Therefore this README does **not** claim model-backed LLM reasoning, dynamic model-selected delegation, or generative reasoning that is not present in the current code. LangGraph is used for workflow orchestration.

## Database Design

TravelWise uses PostgreSQL through Entity Framework Core. The migration history includes schema changes for the core trip model and the four business domains, including budget management, activities, risk management and readiness management. Workflow-related persistence is also represented in the application.

The database is accessed through the backend application layer; client applications do not directly connect to PostgreSQL.

## API Architecture

The ASP.NET Core project contains controllers for core application concerns including:

- authentication and profile/preferences;
- trips and shared trip context;
- budgets and expenses;
- activities;
- risk;
- readiness;
- workflow orchestration and approval;
- administration;
- accommodation/destination discovery.

Swagger/OpenAPI is configured for API exploration in the local backend environment.

## React Web Application

The React application is the browser client for TravelWise. Repository evidence includes authentication/onboarding, traveller-facing functionality, dashboard/application UI, accommodation discovery, maps, workflow-related views and administration/governance UI.

React communicates with the ASP.NET Core backend rather than directly with PostgreSQL or the Python workflow service.

## Flutter Application

The repository contains a Flutter cross-platform client and Flutter tests. It uses HTTP-based API integration with the TravelWise backend. Only functionality represented by the current Flutter source should be treated as implemented; the existence of a corresponding React feature does not by itself establish Flutter parity.

## Authentication and Authorization

The backend implements JWT-based authentication and password hashing. Public registration assigns the Traveller role. Authenticated profile and preference endpoints use `[Authorize]`.

The codebase also contains role-based governance for Reviewer/Admin operations. Authorization must be evaluated per endpoint; the existence of JWT/RBAC infrastructure does not imply that every trip-specific endpoint is ownership-protected.

## Third-Party Integrations

### Open-Meteo

The backend contains an Open-Meteo weather integration used by the Travel Safety & Risk domain.

### Geoapify

The backend contains a Geoapify integration used for destination/accommodation-related discovery functionality.

## Repository Structure

```text
TravelWise/
├── backend/       ASP.NET Core API, EF Core and tests
├── frontend/      React/Vite web application
├── mobile/        Flutter client
├── ai-service/    FastAPI/LangGraph workflow service
├── docs/          Project documentation
├── .github/       GitHub Actions configuration
└── README.md
```

## Local Development

### Prerequisites

Install compatible versions of:

- .NET 8 SDK
- PostgreSQL
- Python 3.11+
- Node.js
- Flutter

### Backend and Database

```bash
cd backend/TravelWise.API
dotnet ef database update
dotnet run --launch-profile http
```

The documented local backend profile uses `http://localhost:5179`, with Swagger available at `/swagger`.

### Agent Service

```bash
cd ai-service
python -m venv .venv
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### React

```bash
cd frontend
npm install
npm run dev
```

### Flutter

```bash
cd mobile
flutter pub get
flutter run
```

## Environment and Secret Configuration

The repository contains example environment files for configuration guidance. Secrets, database passwords, JWT signing keys and third-party credentials must not be copied into documentation or committed as production credentials.

The current repository revision contains sensitive-looking development values in backend configuration. They are intentionally not reproduced in this README. Those values should be treated as exposed development secrets and rotated/moved to environment-based secret configuration before production use.

## Testing

The repository contains automated testing infrastructure across multiple layers:

- **ASP.NET Core/xUnit** tests for backend behaviour.
- **pytest** tests for the Python workflow service, including golden-case/safety-oriented scenarios.
- **Flutter** unit/widget testing.
- **Playwright** browser workflow testing configured through the React project.
- React production build validation.

Test files and CI commands establish the existence of these suites. This README does not claim local pass counts or performance measurements without independently retained execution evidence.

## CI/CD

`.github/workflows/ci.yml` runs on pushes and pull requests targeting `main`. The workflow defines separate jobs for:

- .NET restore, build and backend tests;
- Python dependency installation and pytest;
- Flutter dependency installation, static analysis and tests;
- React dependency installation, production build and Playwright workflow tests.

The existence of the workflow is documented separately from the status of any particular run.

## Deployment

The repository includes deployment-related documentation/configuration, and the GitHub repository metadata declares a Vercel homepage for the web application. Deployment of each tier should only be described as live when its current endpoint is independently verified.

Local development and deployment are intentionally treated as separate states in this documentation.

## Git Workflow

The repository contains a commit history with incremental implementation work and GitHub pull-request support. Contribution ownership should be established from commit/PR evidence rather than inferred solely from filenames or documentation.

## Individual and Shared Contribution Boundaries

The four primary business-component ownership boundaries are:

| Primary component | Specialist workflow component |
| --- | --- |
| Smart Budget & Expense Management | Budget Agent |
| Experience & Activity Planning | Activity Agent |
| Travel Safety & Risk Management | Risk Agent |
| Travel Document & Readiness Management | Readiness Agent |

Harini's expected primary academic slice is **Smart Budget & Expense Management + Budget Agent**. Detailed claims about individual backend, database, React, Flutter, testing and integration ownership should be supported by Git/PR evidence.

Shared infrastructure includes the central orchestrator, shared trip context, authentication/authorization infrastructure, workflow persistence, deterministic workflow validation, HITL/governance, common integration infrastructure, CI/deployment work and project documentation unless Git evidence establishes a more specific ownership split.

## Documentation

Additional project documentation is available under `docs/`, including architecture, project overview, business rules, deployment and AI-disclosure material. Documentation claims should remain consistent with executable code and repository evidence.

## Security Notes for Reproduction

Do not publish real secrets or reuse credentials found in Git history. Configure local/deployed credentials through appropriate environment or secret-management mechanisms. Evaluate ownership authorization on trip-scoped endpoints before exposing the application to real users.

## Academic Documentation Principle

This README describes repository evidence from the current TravelWise implementation. It deliberately avoids presenting planned features, unsupported roles, unverified performance numbers or unverified model-backed AI behaviour as completed work.
