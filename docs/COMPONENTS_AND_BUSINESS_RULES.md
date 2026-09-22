# TravelWise — Components & Business Rules Specification

**Module**: SE3090 Software Engineering Frameworks  
**System**: TravelWise Hybrid Deterministic & Agentic Travel Safety Platform

---

## 1. Domain Component Overview

TravelWise divides travel management into distinct, highly cohesive domains. Each domain features deterministic validation rules that are enforced before any persistent state changes occur.

---

## 2. Trips Management Domain

### Invariants & Validation Rules
1. **Mandatory Geography**: A trip must have non-empty `StartingPlace` and `Destination`.
2. **Temporal Validity**: `StartDate` must precede or equal `ReturnDate` (`StartDate <= ReturnDate`). Retroactive trips are rejected.
3. **Capacity Constraints**: `TravellerCount` must be an integer $\ge 1$.
4. **Financial Base**: `BudgetAmount` must be $\ge 0.00$.
5. **Search & Discovery**: Keyword queries execute case-insensitive matching (`EF.Functions.ILike`) against `Destination` and `StartingPlace`.

### Trip Lifecycle States
- `PLANNING`: Initial state when creating itinerary, budget, and activities.
- `AWAITING_APPROVAL`: AI workflow has run and is pending human reviewer evaluation.
- `APPROVED`: Human reviewer has certified the itinerary and safety mitigations.
- `ACTIVE`: The trip is currently in progress.
- `COMPLETED`: All travel dates have elapsed and expenses are reconciled.

---

## 3. Smart Budget & Expense Domain

### Mathematical Formulations
- **Total Spent**:
  $$\text{TotalSpent} = \sum_{i=1}^{n} \text{Expense}_i.\text{Amount}$$
- **Remaining Budget**:
  $$\text{RemainingBudget} = \text{BudgetAmount} - \text{TotalSpent}$$
- **Spending Ratio**:
  $$\text{SpendRatio} = \frac{\text{TotalSpent}}{\text{BudgetAmount}} \times 100\%$$

### Health Classification Engine
```text
IF SpendRatio >= 100% OR RemainingBudget <= 0:
    Status = "CRITICAL"
    Action = Block additional discretionary expenses & alert user
ELSE IF SpendRatio >= 80%:
    Status = "WARNING"
    Action = Issue visual budget threshold alert
ELSE:
    Status = "HEALTHY"
    Action = Normal spending velocity
```

---

## 4. Experience & Activity Planning Domain

### Scheduling Rules
1. **Internal Chronology**: Every activity must satisfy:
   $$\text{StartTime} < \text{EndTime}$$
2. **Trip Boundary Invariant**: Activities cannot occur outside the trip window:
   $$\text{Trip}.\text{StartDate} \le \text{Activity}.\text{StartTime} \quad \text{AND} \quad \text{Activity}.\text{EndTime} \le \text{Trip}.\text{ReturnDate}$$
3. **Clash Detection**: Two activities $A$ and $B$ belonging to the same trip conflict if:
   $$A.\text{StartTime} < B.\text{EndTime} \quad \text{AND} \quad B.\text{StartTime} < A.\text{EndTime}$$
   Conflicting items are flagged to avoid impossible itineraries.

---

## 5. Travel Safety & Risk Management Domain

### Dynamic Weather & Risk Assessment
- **Primary Data Source**: Live REST telemetry from Open-Meteo API using latitude and longitude coordinates.
- **Fail-Safe Circuit Breaker**: If Open-Meteo is unreachable (network timeout, rate limiting, or offline), `WeatherService.cs` engages an automatic fallback to regional seasonal baseline models (e.g., Sri Lankan Hill Country monsoon vs. dry season norms).
- **Risk Index (0–100 Scale)**:
  - Precipitation $> 15\text{ mm/day} \implies +30$ points
  - Wind Speed $> 40\text{ km/h} \implies +25$ points
  - Extreme Temperature ($< 10^\circ\text{C}$ or $> 35^\circ\text{C}$) $\implies +20$ points
- **Risk Severity Levels**:
  - `0 - 29`: **LOW** — Favorable conditions; standard travel precautions.
  - `30 - 69`: **MODERATE** — Mild hazards (light rain, moderate wind); pack accordingly.
  - `70 - 89`: **HIGH** — Significant weather disruption; outdoor activities should be rescheduled.
  - `90 - 100`: **CRITICAL** — Extreme weather hazard; mandatory human review required before trip departure.

---

## 6. Document & Readiness Management Domain

### Checklist & Scoring Rules
- Readiness categories: Identification/Passport, Travel Visa, Medical & Travel Insurance, Transport Tickets, Accommodation Confirmations, Emergency Contact Card.
- **Readiness Formula**:
  $$\text{ReadinessScore} = \left( \frac{\text{CompletedItems}}{\text{TotalMandatoryItems}} \right) \times 100$$
- **Readiness Classification**:
  - `Score >= 80`: **READY**
  - `50 <= Score < 80`: **PARTIALLY_READY**
  - `Score < 50`: **NOT_READY**

---

## 7. AI Multi-Agent Workflow & Human Approval Domain

### Agent Responsibilities
1. **Budget Agent**: Analyzes category breakdowns (Food, Transport, Accommodation, Leisure) against total trip funds.
2. **Activity Agent**: Reviews itinerary density and recommends optimal time-slots.
3. **Risk Agent**: Evaluates weather severity, terrain warnings, and road advisories.
4. **Readiness Agent**: Computes document readiness and highlights missing compliance documents.

### Post-Orchestration Invariant Validation
Before any AI workflow output is stored:
1. Every requested agent must report `status == "SUCCESS"`.
2. Scores generated by agents must fall within bounded ranges $[0, 100]$.
3. Risk and readiness classifications must strictly match validated enumeration sets.
4. If validation succeeds, `workflow_status` becomes `AWAITING_APPROVAL` and `approval_status` becomes `PENDING`.
5. Only an authorized user (`Reviewer` or `Admin`) can transition the status to `APPROVED`.

---

## 8. Accommodation Discovery & Property Exploration Domain (Phase 3)

### Core Architecture & Gateway Separation
- **Client Isolation**: React and Flutter clients never contact external geocoding or places APIs directly. All discovery traffic routes through the ASP.NET Core API (`/api/Accommodations/*`), keeping provider credentials (`GEOAPIFY_API_KEY`) secure server-side.
- **Provider Safeguards**: The backend integrates a rate-guarding `GeoapifyRequestBudget` and memory caching (10-minute cache with OpenStreetMap attribution) to avoid exceeding free-tier allowances or leaking query credentials.

### Strict "No Fake Data" Business Invariants
1. **No Invented Pricing**: Places discovery APIs do not return live hotel room inventory or booking tariffs. The application displays transparent notices (*"Live pricing not available · Check provider for current rates"*) rather than generating speculative or mock prices.
2. **No Fabricated Reviews or Star Ratings**: Star ratings and user review counts are omitted unless verified and supplied by an authoritative provider.
3. **No Phantom Booking**: The system does not claim a property is reserved or booked. Accommodation discovery serves exploratory itinerary planning without misrepresenting booking status.
4. **Honest Category Representation**: Where actual property photographs are unavailable from the provider, modern architectural category illustrations (Hotel, Resort, Guest House, Hostel, Apartment) are shown with explicit visual disclaimers.

### Search & Exploration Features
- **Worldwide Autocomplete**: Debounced locality search across global cities and regions with explicit user selection to establish precise latitude/longitude coordinates.
- **Temporal & Guest Validation**: Check-in must be today or in the future; Check-out must strictly follow Check-in; integer constraints on adult, child, and room counts.
- **Interactive Leaflet Map & Card Synchronization**: Real coordinates from provider results populate Leaflet markers. Hovering or clicking a card highlights the corresponding marker; clicking a marker scrolls the card into view.
- **"Search This Area"**: When the user pans or zooms the map, an unobtrusive floating trigger enables re-querying the backend using the new map center coordinates and radius without automatic request spamming.
- **Property Details & Nearby POI Exploration**: Selecting a property reveals provider-supported details and fetches genuine nearby POIs (Restaurants, Cafés, Attractions, Public Transport, Healthcare, Shopping) within a 2.5 km radius, mapped on the same interactive canvas.
- **Trip Context Bridge**: When exploring accommodation while planning a trip, destination and travel dates seamlessly pre-populate from the active trip context while permitting flexible traveller modification.

