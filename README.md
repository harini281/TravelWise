# TravelWise — Intelligent Travel Safety & Itinerary Platform

TravelWise is developed as part of the **SE3090 Software Engineering Frameworks** university project.

It provides a full-stack, enterprise-grade travel management platform that combines **deterministic business rules** (for financial integrity, schedule overlap prevention, and risk scoring) with an **agentic multi-agent artificial intelligence service** (powered by LangGraph) and **human-in-the-loop governance**.

---

## Implemented Features

- **ASP.NET Core Web API backend** (`http://localhost:5179`)
- **PostgreSQL database integration** using Entity Framework Core 8
- **Trip management and shared trip context**
  - Trip creation, editing, deletion, and retrieval
  - Case-insensitive search (`EF.Functions.ILike`) across destinations and starting points
- **Smart Budget & Expense Management**
  - Budget tracking and category allocations
  - Expense CRUD operations
  - Remaining budget calculation
  - Spending percentage tracking
  - Deterministic budget health analysis (`HEALTHY`, `WARNING`, `CRITICAL`)
- **Experience & Activity Planning**
  - Activity CRUD operations
  - Trip-date boundary validation (activities must fall within trip dates)
  - Activity schedule validation (`StartTime` < `EndTime` and conflict detection)
- **Travel Safety & Risk Management**
  - Open-Meteo live weather API integration
  - Weather data retrieval and condition scoring
  - Deterministic trip risk assessment (0–100 risk scale)
  - Safe, graceful handling of unavailable weather data with seasonal baseline fallbacks
- **Travel Document & Readiness Management**
  - Travel requirement checklists (passports, visas, insurance, hotel bookings)
  - Readiness checklist tracking
  - Deterministic readiness assessment (0–100% readiness score)
- **Client Applications**
  - React web application connected to the ASP.NET Core API (`http://localhost:5173`)
  - Flutter cross-platform application connected to the same ASP.NET Core API (`http://localhost:5174`)
- **AI Multi-Agent Workflow Engine**
  - AI workflow persistence in PostgreSQL (`WorkflowInstances`, `AgentTasks`)
  - Human-in-the-loop approval workflow (`AWAITING_APPROVAL` $\to$ `APPROVED`)
  - Specialized AI agent components for:
    - **Budget Agent**: Evaluates spend velocity and category limits
    - **Activity Agent**: Recommends optimized activity schedules
    - **Risk Agent**: Synthesizes weather alerts and travel advisories
    - **Readiness Agent**: Computes pre-departure compliance
  - LangGraph-based workflow/orchestration structure
  - Post-orchestration invariant validation and approval state transitions
- **Security, Identity & RBAC**
  - PBKDF2 password hashing with cryptographic salting
  - JWT Bearer token authentication
  - Role-Based Access Control (`Traveller`, `Reviewer`, `Admin`)
  - Swagger UI with Bearer token authorization support
- **Quality Assurance & DevOps**
  - Automated .NET xUnit test suite (deterministic validation & authentication)
  - Automated Python pytest suite (golden cases & API health)
  - Flutter test suite (widget smoke test & DTO serialization)
  - Multi-tier GitHub Actions Continuous Integration pipeline (`.github/workflows/ci.yml`)

---

## Current Architecture

The client applications do not access the database directly. All client requests pass through the ASP.NET Core API as the single entry point.

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
```

---

## Port Allocation Reference

| Service | Technology | Port / URL | Notes |
| :--- | :--- | :--- | :--- |
| **Backend API** | ASP.NET Core 8 | `http://localhost:5179` | Swagger UI at `http://localhost:5179/swagger` |
| **Agentic AI** | Python FastAPI / LangGraph | `http://127.0.0.1:8000` | Health check at `http://127.0.0.1:8000/health` |
| **Web Frontend** | React 19 / Vite | `http://localhost:5173` | Browser web client |
| **Flutter Client**| Flutter Web / Mobile | `http://localhost:5174` | Cross-platform client |
| **Database** | PostgreSQL 16 | `localhost:5432` | Database name: `travelwise` |

---

## Quick Start & Local Setup

### 1. Prerequisites
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 20+](https://nodejs.org/)
- [Flutter 3.28+](https://flutter.dev/docs/get-started/install)
- [PostgreSQL 16](https://www.postgresql.org/download/)

### 2. Database Migration & Backend Startup
```bash
# Navigate to backend API directory
cd backend/TravelWise.API

# Update database schema with EF Core migrations
dotnet ef database update

# Run the ASP.NET Core API
dotnet run --launch-profile http
```
The API is now running at `http://localhost:5179`. Open `http://localhost:5179/swagger` to explore the interactive API documentation.

### 3. Agentic AI Service Startup
```bash
# Open a new terminal and navigate to ai-service directory
cd ai-service

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI service
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. React Web Frontend Startup
```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```
The web dashboard is now accessible at `http://localhost:5173`.

### 5. Flutter Client Startup
```bash
# Open a new terminal and navigate to mobile directory
cd mobile

# Get dependencies
flutter pub get

# Run on Chrome
flutter run -d chrome --web-port=5174
```

---

## Running the Automated Test Suites

### Backend .NET Tests (xUnit)
```bash
dotnet test backend/TravelWise.Tests/TravelWise.Tests.csproj
```
Executes deterministic validation tests (budget overspend, chronological bounds, time clash detection) and authentication tests (password hashing, JWT verification).

### AI Service Tests (Pytest)
```bash
cd ai-service
pytest tests/
```
Executes golden-case scenario tests for multi-agent execution, state invariants, and health endpoints.

### Flutter Tests
```bash
cd mobile
flutter test
```
Executes widget rendering and DTO serialization unit tests.

---

## Default Demo Credentials

To seed default test users into the database, trigger the seeding endpoint:
```bash
curl -X POST http://localhost:5179/api/Auth/seed-demo-users
```

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Traveller** | `traveller@travelwise.local` | `Traveller123!` | Personal trip planning, budget logging |
| **Reviewer** | `reviewer@travelwise.local` | `Reviewer123!` | AI workflow evaluation, approval actions |
| **Administrator** | `admin@travelwise.local` | `Admin123!` | System-wide administrative controls |

---

## Key API Endpoints

### Trips & Context
- `GET /api/Trips` — List trips (supports `?search=` case-insensitive search)
- `GET /api/Trips/{id}` — Fetch full trip context
- `POST /api/Trips` — Create new trip with boundary validation
- `PUT /api/Trips/{id}` — Update trip details
- `DELETE /api/Trips/{id}` — Delete trip

### Smart Budget & Expenses
- `GET /api/Expenses/trip/{tripId}` — List all expenses for a trip
- `POST /api/Expenses` — Record a new expense (validates remaining budget)
- `GET /api/Budget/trip/{tripId}/summary` — Retrieve deterministic budget health

### Travel Safety & Risk
- `GET /api/Risk/trip/{tripId}` — Get latest risk assessment
- `POST /api/Risk/assess/trip/{tripId}` — Perform deterministic risk assessment with weather fallback

### AI Workflow Orchestration & Human Approval
- `POST /api/Workflow/trip/{tripId}/run` — Trigger LangGraph multi-agent orchestration
- `GET /api/Workflow/trip/{tripId}/status` — Check workflow progress and agent task outputs
- `POST /api/Workflow/{workflowId}/approve` — Approve AI-generated plan (Reviewer/Admin)
- `POST /api/Workflow/{workflowId}/reject` — Reject AI plan with feedback

### Authentication & Identity
- `POST /api/Auth/register` — Register a new user
- `POST /api/Auth/login` — Authenticate and receive JWT Bearer token
- `GET /api/Auth/me` — Verify authenticated identity and roles

---

## University Viva Voce & Demonstration Guide

When demonstrating TravelWise to examiners:

1. **Architecture Walkthrough**:
   - Point to the **Single Entry Point** architecture: show that both React and Flutter speak exclusively to ASP.NET Core (`:5179`).
   - Highlight the microservice separation of the Python AI service (`:8000`), explaining that AI processing is isolated from transaction processing.
2. **Deterministic Business Rules Demonstration**:
   - Demonstrate logging an expense that exceeds the budget limit $\to$ show the immediate `CRITICAL` status and remaining budget reduction.
   - Demonstrate adding an activity outside the trip date range $\to$ show the validation rejection.
3. **Resilience Demonstration**:
   - Demonstrate the weather risk assessment. Explain that if the third-party weather API is unreachable, the system automatically falls back to seasonal baseline values without throwing a 503 error.
4. **Agentic Workflow & Human-in-the-Loop**:
   - Trigger the AI workflow for Trip 2 (Colombo to Ella).
   - Show the 4 agents (Budget, Activity, Risk, Readiness) executing in LangGraph.
   - Show that the state transitions to `AWAITING_APPROVAL` with `PENDING` approval.
   - Demonstrate that the plan requires an authenticated human reviewer to approve before it becomes finalized.
5. **Quality Assurance**:
   - Run `dotnet test`, `pytest`, and `flutter test` live in the terminal to demonstrate automated test coverage across all tiers.

---

## Documentation Library

For in-depth architectural and design documentation, see the `docs/` directory:
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Components & Business Rules](docs/COMPONENTS_AND_BUSINESS_RULES.md)
- [Academic AI Disclosure](docs/AI_DISCLOSURE.md)
