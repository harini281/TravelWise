# ADR-001: Agentic Multi-Agent AI Workflow Integration & Human-in-the-Loop Governance

## Status
Accepted

## Context
TravelWise requires an intelligent travel planning system capable of assessing multi-dimensional trip plans (budget feasibility, activity scheduling, weather/safety risk, and pre-departure document compliance). 

Historically, travel platforms either rely on static hard-coded forms or single monolithic Large Language Model (LLM) prompts. However, monolithic prompts present significant risks in a safety-critical and financial platform:
1. **Hallucination Risk**: An LLM may fabricate flight details, invent unrealistic budgets, or miss schedule clashes.
2. **Lack of Invariant Enforcement**: Critical business rules (e.g. expenses exceeding total budget, activities scheduled before trip start) must be mathematically strictly enforced.
3. **Auditability & Observability**: Academic and enterprise review requires transparent agent execution traces rather than black-box decisions.
4. **Service Resilience & Failure Isolation**: If the AI model or external API experiences downtime or quota exhaustion, core platform operations (viewing trips, logging expenses, reading static safety guidelines) must continue without interruption.

## Options Considered

### Option 1: Monolithic Server-Side LLM Call
A single prompt to Gemini or OpenAI that receives the entire trip context and produces a single JSON recommendation.
- *Pros*: Quick to prototype; minimal microservice overhead.
- *Cons*: High token usage; frequent hallucinations on numerical calculations; impossible to inspect intermediate agent steps; zero resilience against partial prompt failures.

### Option 2: Embedded Direct Client AI Calls
Direct client-side LLM SDK calls from React or Flutter.
- *Pros*: Serverless architecture.
- *Cons*: Exposes provider API keys directly to browser clients; bypasses database persistence; completely unmaintainable RBAC and approval controls.

### Option 3: LangGraph Agentic Microservice with Gateway Orchestration & Deterministic Verification (Chosen)
An isolated Python FastAPI microservice utilizing a LangGraph state graph with four specialized domain agents:
1. **Budget Agent**: Analyzes burn rate, category allocations, and remaining reserves.
2. **Activity Agent**: Validates chronological itinerary boundaries and flags scheduling overlaps.
3. **Risk Agent**: Integrates live Open-Meteo telemetry and computes structured risk scores with seasonal baseline fallbacks.
4. **Readiness Agent**: Verifies passport, visa, vaccination, and insurance readiness checklists.

The ASP.NET Core Web API serves as the sole gateway, persisting workflow instances (`AIWorkflows`, `WorkflowAuditLogs`) in PostgreSQL. Upon receiving agent recommendations, ASP.NET Core runs strict deterministic invariant checks before transitioning the plan to `AWAITING_APPROVAL`. Final deployment of recommendations requires authorized human governance (`Reviewer` or `Admin` role).

## Decision
We decided to adopt **Option 3**: An isolated LangGraph multi-agent AI microservice operating behind the ASP.NET Core Web API gateway, coupled with deterministic validation and human-in-the-loop governance.

Key architectural boundaries:
1. **Single Entry Point**: React and Flutter clients communicate exclusively with ASP.NET Core (`:5179`). Clients never communicate directly with the AI service or external LLMs.
2. **Strict Deterministic Invariant Layer**: AI outputs are treated as advisory proposals. ASP.NET Core enforces deterministic validation on budget caps, time bounds, and risk ratings before writing state.
3. **Safe Failure & Fallback**: If the Python service is unreachable, ASP.NET Core handles the transport exception and transitions the workflow into a graceful `SAFE_FAILURE` state with `FALLBACK_DETERMINISTIC` status. Core operations remain fully functional.
4. **Role-Based Human Approval**: Unapproved AI proposals cannot automatically alter financial allocations or confirm itineraries. Only authenticated users with `Reviewer` or `Admin` roles can submit decisions via `POST /api/Workflow/{id}/approval`.

## Consequences

### Positive
- **Safety & Mathematical Integrity**: Zero hallucinated financial numbers or schedule conflicts can bypass deterministic post-validation.
- **Microservice Decoupling**: AI model dependencies (LangGraph, Python packages) are completely decoupled from the .NET core database and client apps.
- **Fail-Safe Operation**: Downtime in the AI cluster degrades gracefully without crashing the web or mobile applications.
- **Granular Audit Trail**: Every agent's contribution is persisted and queryable in PostgreSQL, enabling full viva-voce demonstration and regulatory auditing.
- **Role-Based Security**: RBAC boundaries prevent unauthorized travellers from approving their own AI plans.

### Negative / Trade-offs
- **Operational Complexity**: Requires running both ASP.NET Core (`:5179`) and Python FastAPI (`:8000`) services in development and production.
- **Network Latency**: Inter-service communication adds nominal overhead (~5 seconds end-to-end for multi-agent graph execution), managed asynchronously via progress states in the client.
