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

## Default Demo Credentials & Role Permissions

To seed default test users into the database, trigger the seeding endpoint:
```bash
curl -X POST http://localhost:5179/api/Auth/seed-demo-users
```

| Persona | Username | Email | Password | Role Description |
| :--- | :--- | :--- | :--- | :--- |
| **Traveller** | `traveller` | `traveller@travelwise.lk` | `Traveller123!` | Standard traveller creating itineraries, managing expenses, and triggering AI workflows. |
| **Reviewer** | `reviewer` | `reviewer@travelwise.lk` | `Reviewer123!` | Safety & financial reviewer authorized to approve, reject, or request revisions on plans. |
| **Administrator** | `admin` | `admin@travelwise.lk` | `Admin123!` | System administrator with global governance, seeding, and management permissions. |

### Role-Based Authorization Matrix

| System Capability / Endpoint | Unauthenticated | Traveller | Reviewer | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| **View Trip Context & Itinerary** (`GET /api/Trips/{id}`) | ✓ | ✓ | ✓ | ✓ |
| **Read Budget & Expense History** (`GET /api/Budgets/{id}/health`) | ✓ | ✓ | ✓ | ✓ |
| **Log Financial Transactions** (`POST /api/Expenses`) | ✓ | ✓ | ✓ | ✓ |
| **Inspect Risk & Weather Telemetry** (`GET /api/Risk/weather/trip/{id}`) | ✓ | ✓ | ✓ | ✓ |
| **Trigger AI Orchestration** (`POST /api/Workflow/trip/{id}/run`) | ✓ | ✓ | ✓ | ✓ |
| **Evaluate & Approve Workflow** (`POST /api/Workflow/{id}/approval`) | ✕ (401) | ✕ (403 Forbidden) | ✓ (200 OK) | ✓ (200 OK) |
| **Seed Test Data** (`POST /api/Auth/seed-demo-users`) | ✕ | ✕ | ✕ | ✓ (200 OK) |

---

## Safe Failure & Graceful Degradation Architecture

TravelWise implements a **fail-safe resilience architecture** guaranteeing system availability even during partial service disruptions:

1. **AI Service Outage (`SAFE_FAILURE` state)**:
   - When the Python FastAPI AI service is unreachable, ASP.NET Core catches the transport exception and transitions the workflow into a `SAFE_FAILURE` state with `FALLBACK_DETERMINISTIC` markers.
   - Deterministic safety checks (budget balance calculations, date boundary verifications) remain active.
   - A high-visibility warning banner is rendered on both React and Flutter clients notifying users:
     > *"⚠️ Safe Failure Notice: AI service is temporarily unavailable. Deterministic safety checks were completed where possible. AI-generated recommendations are unavailable. Human review is required."*
   - Plan approval remains blocked until reviewed by an authorized human.

2. **External Weather API Outage (Open-Meteo Fallback)**:
   - If the Open-Meteo external weather API times out or fails, the Risk Manager logs a warning and falls back to seasonal baseline climate estimates for Sri Lanka rather than returning an HTTP 500 error.

---

## Performance Benchmark & Latency Audit

Run the automated performance benchmark suite:
```bash
python scripts/performance_benchmark.py
```

### Verified Benchmark Results (Local Audit)

| Operation / Endpoint | Sample Size | Avg Latency | Max Latency | Failure Rate | SLA Compliance |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `GET /api/Trips/2` (Read Trip Context) | 5 | ~20 ms | 25 ms | 0.0% | **PASS** (< 100 ms) |
| `POST /api/Expenses` (Financial Transaction) | 5 | ~24 ms | 31 ms | 0.0% | **PASS** (< 100 ms) |
| `GET /api/Risk/weather/trip/2` (Open-Meteo Integration) | 5 | ~667 ms | 810 ms | 0.0% | **PASS** (< 2000 ms) |
| `POST /api/Workflow/trip/2/run` (Multi-Agent LangGraph) | 3 | ~5012 ms | 5350 ms | 0.0% | **PASS** (< 10000 ms) |

---

## Key API Endpoints Reference

### Trips & Context
- `GET /api/Trips` — List trips (supports `?search=` case-insensitive search)
- `GET /api/Trips/{id}` — Fetch full trip context
- `POST /api/Trips` — Create new trip with boundary validation
- `PUT /api/Trips/{id}` — Update trip details
- `DELETE /api/Trips/{id}` — Delete trip

### Smart Budget & Expenses
- `GET /api/Expenses/trip/{tripId}` — List all expenses for a trip
- `POST /api/Expenses` — Record a new expense (validates remaining budget)
- `GET /api/Budgets/{budgetId}/health` — Retrieve deterministic budget health

### Travel Safety & Risk
- `GET /api/Risk/weather/trip/{tripId}` — Retrieve live weather telemetry
- `POST /api/Risk/assess/trip/{tripId}` — Perform deterministic risk assessment with seasonal fallback

### AI Workflow Orchestration & Human Approval
- `POST /api/Workflow/trip/{tripId}/run` — Trigger LangGraph multi-agent orchestration
- `GET /api/Workflow/trip/{tripId}` — Check latest workflow status and agent tasks
- `POST /api/Workflow/{workflowId}/approval` — Submit human approval decision (`[Authorize(Roles = "Reviewer,Admin")]`)

### Authentication & Identity
- `POST /api/Auth/register` — Register a new user
- `POST /api/Auth/login` — Authenticate and receive JWT Bearer token
- `GET /api/Auth/me` — Verify authenticated identity and claims (`[Authorize]`)
- `POST /api/Auth/seed-demo-users` — Seed default demo personas

---

## University Viva Voce & Demonstration Guide

Follow this 5-step live demonstration sequence during your examination:

1. **Step 1: Architecture & Single Entry Point Gateway**:
   - Show that both the **React Web client** (`:5173`) and **Flutter client** (`:5174`) communicate exclusively through the **ASP.NET Core Web API Gateway** (`:5179`).
   - Show that the **Python LangGraph AI service** (`:8000`) is fully isolated as an internal microservice.

2. **Step 2: Deterministic Business Invariants**:
   - In Expense Management, add an expense exceeding the trip's remaining budget $\to$ show that the deterministic budget health instantly shifts to `CRITICAL`.
   - In Activity Planning, attempt to add an activity outside the trip dates $\to$ observe the validation rejection preventing invalid state.

3. **Step 3: Multi-Agent AI Workflow Orchestration**:
   - On Trip 2 (Colombo $\to$ Ella), click **⚡ Run Intelligent Trip Plan**.
   - Observe the 4 specialized agents execute:
     - **Budget Agent**: Analyzes burn rate and category allocations.
     - **Activity Agent**: Validates itinerary density and scheduling conflicts.
     - **Risk Agent**: Synthesizes Open-Meteo weather telemetry and calculates safety risk score.
     - **Readiness Agent**: Computes pre-departure compliance and checklist readiness.
   - Show that upon completion, the workflow transitions to `AWAITING_APPROVAL` with `PENDING` approval.

4. **Step 4: Role-Based Human Governance (RBAC Enforcement)**:
   - Log in as **Traveller** (`traveller`) $\to$ notice that the approval buttons are disabled and a notice explains approval is restricted.
   - Log in as **Reviewer** (`reviewer`) $\to$ enter review feedback and click **✓ Approve Plan**.
   - Show the workflow status update to `COMPLETED` with `APPROVED` status and recorded reviewer metadata.

5. **Step 5: Automated Testing & Continuous Integration**:
   - In terminal, show all 4 test suites passing:
     - `dotnet test backend/TravelWise.Tests/TravelWise.Tests.csproj` (13/13 passing)
     - `pytest tests/` in `ai-service/` (8/8 passing)
     - `flutter test` and `flutter analyze` in `mobile/` (3/3 passing, 0 issues)
     - `npm run build` in `frontend/` (0 errors)
   - Show the green GitHub Actions CI badge on repository.

---

## Documentation Library

For in-depth architectural and design documentation, see the `docs/` directory:
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Components & Business Rules](docs/COMPONENTS_AND_BUSINESS_RULES.md)
- [Academic AI Disclosure](docs/AI_DISCLOSURE.md)
- [Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
