# TravelWise — System Architecture Specification

**Module**: SE3090 Software Engineering Frameworks  
**System**: TravelWise Hybrid Deterministic & Agentic Travel Safety Platform

---

## 1. Architectural Philosophy & Principles

The TravelWise platform is engineered around four core architectural tenets:

1. **Single Entry Point (API Gateway Pattern)**:  
   Client applications (both React and Flutter) communicate **exclusively** with the ASP.NET Core Web API on port `5179`. Direct connections from client applications to the PostgreSQL database or the Python AI microservice are strictly prohibited by design. This guarantees unified access logging, centralized authentication/authorization, and consistent data validation.

2. **Deterministic-First Decision Making**:  
   AI models should never be the final arbiters of financial, scheduling, or safety-critical data. Calculations such as remaining budget percentages, time overlap detection, and risk scoring are codified deterministically in C# and Python algorithms before any agent suggestions are accepted.

3. **Human-in-the-Loop AI Orchestration**:  
   The Python LangGraph microservice processes complex travel context and generates recommendations, but cannot autonomously finalize trips. Every workflow run terminates in an `AWAITING_APPROVAL` status until an authenticated human reviewer explicitly approves or rejects the plan.

4. **Resilience & Fault Tolerance**:  
   External dependencies (such as the Open-Meteo weather API) are wrapped with defensive circuit breaker/fallback patterns. If remote weather sensors fail, the system falls back to regional seasonal baseline data, ensuring 100% operational uptime without HTTP 503 outages.

---

## 2. System Topology & Network Map

```text
┌─────────────────────────┐          ┌─────────────────────────┐
│     React Web App       │          │   Flutter Cross-Platform│
│  http://localhost:5173  │          │  http://localhost:5174  │
└────────────┬────────────┘          └────────────┬────────────┘
             │                                    │
             │           HTTP / JSON              │
             └─────────────────┬──────────────────┘
                               ▼
            ┌───────────────────────────────────────┐
            │       ASP.NET Core Web API            │
            │       http://localhost:5179           │
            │  ───────────────────────────────────  │
            │  • JWT Bearer Authentication & RBAC   │
            │  • Deterministic Business Rules Core  │
            │  • Entity Framework Core 8 ORM        │
            │  • Weather Resilience Fallback Engine │
            └──────────┬─────────────────┬──────────┘
                       │                 │
           SQL / Port 5432         HTTP / Port 8000
                       │                 │
                       ▼                 ▼
            ┌──────────────────┐   ┌────────────────────────────────┐
            │   PostgreSQL 16  │   │  Python Agentic AI Service     │
            │    travelwise    │   │  http://127.0.0.1:8000         │
            │                  │   │  ────────────────────────────  │
            │  • Trips         │   │  • FastAPI Microservice        │
            │  • Budgets       │   │  • LangGraph Orchestrator      │
            │  • Expenses      │   │  • Budget Agent                │
            │  • Activities    │   │  • Activity Agent              │
            │  • Risks         │   │  • Risk Agent                  │
            │  • Workflows     │   │  • Readiness Agent             │
            │  • Users (RBAC)  │   │  • Post-Run Invariant Engine   │
            └──────────────────┘   └────────────────────────────────┘
```

---

## 3. End-to-End Workflow Sequence (Agentic Execution)

```text
Client (React / Flutter)       ASP.NET Core API (:5179)       Python AI Service (:8000)       PostgreSQL (:5432)
         │                               │                                │                       │
         │  POST /api/Workflow/trip/2/run│                                │                       │
         ├──────────────────────────────►│                                │                       │
         │                               │  Query trip, expenses, weather │                       │
         │                               ├───────────────────────────────────────────────────────►│
         │                               │◄───────────────────────────────────────────────────────┤
         │                               │  Aggregated Trip Context Data  │                       │
         │                               │                                │                       │
         │                               │  POST /api/workflow/run        │                       │
         │                               ├───────────────────────────────►│                       │
         │                               │                                │ Run LangGraph:        │
         │                               │                                │ 1. Budget Agent       │
         │                               │                                │ 2. Activity Agent     │
         │                               │                                │ 3. Risk Agent         │
         │                               │                                │ 4. Readiness Agent    │
         │                               │                                │ 5. Invariant Checks   │
         │                               │                                │                       │
         │                               │  Workflow Results JSON         │                       │
         │                               │◄───────────────────────────────┤                       │
         │                               │                                │                       │
         │                               │  Persist WorkflowInstance & Tasks                      │
         │                               ├───────────────────────────────────────────────────────►│
         │                               │◄───────────────────────────────────────────────────────┤
         │                               │                                                        │
         │  HTTP 200 (Awaiting Approval) │                                                        │
         │◄──────────────────────────────┤                                                        │
```

---

## 4. Entity Framework Core Data Model

```text
  ┌───────────────────────────────────────────────────────────┐
  │                           Trip                            │
  ├───────────────────────────────────────────────────────────┤
  │ Id (PK, int)                                              │
  │ StartingPlace (string)                                    │
  │ Destination (string)                                      │
  │ StartDate (datetime)                                      │
  │ ReturnDate (datetime)                                     │
  │ BudgetAmount (decimal)                                    │
  │ TravellerCount (int)                                      │
  │ TripType (string)                                         │
  │ Status (string: PLANNING, APPROVED, ACTIVE, COMPLETED)    │
  │ CreatedAt (datetime)                                      │
  └───────┬──────────────┬──────────────┬─────────────┬───────┘
          │ 1            │ 1            │ 1           │ 1
          │              │              │             │
          ▼ *            ▼ *            ▼ *           ▼ *
  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐
  │   Expense    │ │   Activity   │ │RiskAssessment│ │ WorkflowInstance  │
  ├──────────────┤ ├──────────────┤ ├──────────────┤ ├───────────────────┤
  │ Id (PK)      │ │ Id (PK)      │ │ Id (PK)      │ │ Id (PK)           │
  │ TripId (FK)  │ │ TripId (FK)  │ │ TripId (FK)  │ │ TripId (FK)       │
  │ Category     │ │ Name         │ │ RiskScore    │ │ WorkflowStatus    │
  │ Amount       │ │ StartTime    │ │ RiskLevel    │ │ ApprovalStatus    │
  │ ExpenseDate  │ │ EndTime      │ │ WeatherSummary││ PlanSummary       │
  │ Notes        │ │ Location     │ │ AssessedAt   │ │ CreatedAt         │
  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┬─────────┘
                                                               │ 1
                                                               ▼ *
                                                     ┌───────────────────┐
                                                     │    AgentTask      │
                                                     ├───────────────────┤
                                                     │ Id (PK)           │
                                                     │ WorkflowId (FK)   │
                                                     │ AgentName         │
                                                     │ TaskStatus        │
                                                     │ OutputJson        │
                                                     └───────────────────┘
```

---

## 5. Security & Access Control Architecture

- **Identity Storage**: Dedicated `Users` entity in PostgreSQL. Passwords are never stored in plaintext; they are hashed using PBKDF2 with SHA-256 and a 128-bit cryptographically secure salt.
- **Token Mechanism**: Standard JSON Web Tokens (JWT) signed with HMAC-SHA256 containing `ClaimTypes.NameIdentifier`, `ClaimTypes.Email`, and `ClaimTypes.Role`.
- **Role Permissions**:
  - `Traveller`: Read and manage personal itineraries, log expenses, run AI recommendations.
  - `Reviewer`: Review pending AI workflows, evaluate safety scores, issue approvals.
  - `Admin`: Full system administration, trip overrides, and user management.
