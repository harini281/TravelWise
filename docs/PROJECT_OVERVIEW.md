# TravelWise — Project Overview

**Module**: SE3090 Software Engineering Frameworks  
**Project Name**: TravelWise Intelligent Travel Planning & Multi-Agent Safety Platform  
**Target Repository**: [https://github.com/harini281/TravelWise](https://github.com/harini281/TravelWise)

---

## 1. Executive Summary

TravelWise is a full-stack, enterprise-grade travel management platform designed to address the fragmented, high-friction process of itinerary planning, budget tracking, weather risk mitigation, and departure readiness.

Rather than relying on disjointed spreadsheets or purely generative chatbots prone to hallucinations, TravelWise implements a **hybrid deterministic and agentic architecture**:
1. **Deterministic Business Core**: All financial limits, schedule overlap verifications, weather risk scores, and document readiness calculations are rigorously computed and enforced in the ASP.NET Core backend.
2. **Specialized Multi-Agent AI System**: An independent Python FastAPI microservice powered by LangGraph coordinates four specialized agents (Budget, Activity, Risk, and Readiness).
3. **Human-in-the-Loop Governance**: AI plans cannot be executed automatically; they transition to an `AWAITING_APPROVAL` state requiring explicit human reviewer sign-off before being finalized in PostgreSQL.
4. **Unified Entry Point**: Both client applications (React Web and Flutter Web/Mobile) interact strictly through the ASP.NET Core Web API. Client layers are prohibited from querying PostgreSQL or the AI service directly.

---

## 2. Core Functional Modules

| Module | Purpose | Key Functionality |
| :--- | :--- | :--- |
| **Trips Management** | Core trip context | Destination, dates, budget ceiling, traveller count, case-insensitive search (`EF.Functions.ILike`), and status lifecycle. |
| **Smart Budget & Expenses** | Financial control | Expense logging by category, real-time remaining budget calculations, deterministic budget health classification (`CRITICAL`, `WARNING`, `HEALTHY`), and overspend rejection. |
| **Activity & Itinerary** | Scheduling engine | Time-slot validation, itinerary bounds checking (activities must fall within trip dates, start time < end time), and clash detection. |
| **Travel Safety & Risk** | Hazard awareness | Live integration with Open-Meteo API, deterministic risk scoring (0–100 scale), safety advisory generation, and automatic offline fallback to Sri Lankan seasonal baselines. |
| **Document & Readiness** | Pre-travel compliance | Verification checklist (passports, visas, insurance, hotel confirmations) and weighted readiness score calculation (0–100%). |
| **AI Workflow Orchestration** | Agentic planning | Multi-agent coordination with LangGraph, cross-agent state aggregation, deterministic post-run validation, and approval persistence. |
| **Security & RBAC** | Identity & governance | PBKDF2-hashed password storage, JWT Bearer token authentication, and role-based policies (`Traveller`, `Reviewer`, `Admin`). |

---

## 3. Technology Stack

- **Backend API**: ASP.NET Core 8.0, C# 12, Entity Framework Core 8, Npgsql, System.IdentityModel.Tokens.Jwt
- **Database**: PostgreSQL 16 (relational persistence, foreign key cascades, ILike indexing)
- **AI Microservice**: Python 3.11+, FastAPI, Uvicorn, LangGraph, Pydantic v2, Pytest
- **Web Frontend**: React 19, Vite 8, TypeScript / JavaScript, Modern CSS
- **Mobile/Cross-Platform Client**: Flutter 3.38+ (Dart 3.x), Material 3, HTTP REST client
- **CI/CD**: GitHub Actions (multi-tier automated pipeline for backend, Python, Flutter, and web builds)

---

## 4. Repository Structure

```text
TravelWise/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Multi-tier GitHub Actions continuous integration
├── ai-service/
│   ├── agents/                    # Specialized LangGraph worker agents
│   │   ├── activity_agent.py
│   │   ├── budget_agent.py
│   │   ├── readiness_agent.py
│   │   └── risk_agent.py
│   ├── approval/                  # Human-in-the-loop approval logic
│   ├── orchestrator/              # LangGraph StateGraph orchestration
│   ├── schemas/                   # Pydantic v2 request/response schemas
│   ├── state/                     # Shared workflow state dictionary
│   ├── tests/                     # Automated golden-case test suite
│   ├── tools/                     # Calculation tools invoked by agents
│   ├── validation/                # Post-run rule validation engine
│   ├── main.py                    # FastAPI application entry point (:8000)
│   └── requirements.txt
├── backend/
│   ├── TravelWise.API/            # ASP.NET Core 8 Web API (:5179)
│   │   ├── Controllers/           # REST endpoints (Trips, Budget, Risk, Workflow, Auth)
│   │   ├── Data/                  # AppDbContext with EF Core migrations
│   │   ├── DTOs/                  # Data transfer objects
│   │   ├── Models/                # Domain entities (Trip, Expense, RiskAssessment, User, etc.)
│   │   ├── Services/              # Business logic (AuthService, WeatherService, AIServiceClient)
│   │   └── Program.cs             # Dependency injection, JWT configuration, CORS
│   └── TravelWise.Tests/          # xUnit test project
│       ├── AuthServiceTests.cs    # Password hashing and token validation tests
│       └── DeterministicValidationTests.cs # Business rule validation tests
├── frontend/                      # React 19 + Vite web application (:5173)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── mobile/                        # Flutter cross-platform client (:5174 web)
│   ├── lib/                       # Screen dashboards for all 7 domains
│   ├── test/                      # Smoke & model decoding tests
│   └── pubspec.yaml
└── docs/                          # University Viva and Architectural Documentation
    ├── PROJECT_OVERVIEW.md
    ├── ARCHITECTURE.md
    ├── COMPONENTS_AND_BUSINESS_RULES.md
    └── AI_DISCLOSURE.md
```
