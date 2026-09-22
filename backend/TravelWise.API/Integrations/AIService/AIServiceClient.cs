using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;

namespace TravelWise.API.Integrations.AIService;

public class AIServiceClient : IAIServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly TravelWiseDbContext _context;
    private readonly ILogger<AIServiceClient> _logger;

    public AIServiceClient(
        HttpClient httpClient,
        TravelWiseDbContext context,
        ILogger<AIServiceClient> logger)
    {
        _httpClient = httpClient;
        _context = context;
        _logger = logger;
    }

    public async Task<AIWorkflowRunResponseDto> RunTripWorkflowAsync(
        int tripId,
        int? workflowId = null)
    {
        var trip = await _context.Trips
            .FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            throw new ArgumentException($"Trip with ID {tripId} was not found.");
        }

        var budget = await _context.Budgets
            .FirstOrDefaultAsync(b => b.TripId == tripId);

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .ToListAsync();

        var activities = await _context.Activities
            .Where(a => a.TripId == tripId)
            .ToListAsync();

        var weather = await _context.WeatherData
            .Where(w => w.TripId == tripId && w.IsAvailable)
            .OrderByDescending(w => w.RetrievedAt)
            .FirstOrDefaultAsync();

        var requirements = await _context.TravelRequirements
            .Where(r => r.TripId == tripId)
            .ToListAsync();

        var items = await _context.ReadinessItems
            .Where(i => i.TripId == tripId)
            .ToListAsync();

        var requestPayload = new AIWorkflowRunRequestDto
        {
            WorkflowId = workflowId,
            TripId = tripId,
            UserId = 1,
            TripContext = new
            {
                trip.Id,
                trip.StartingPlace,
                trip.Destination,
                trip.StartDate,
                trip.ReturnDate,
                trip.BudgetAmount,
                trip.TravellerCount,
                trip.TripType
            },
            BudgetContext = new
            {
                totalAmount = budget?.TotalAmount ?? trip.BudgetAmount,
                expenses = expenses.Select(e => new { e.Amount, e.Description, e.ExpenseDate })
            },
            ActivityContext = new
            {
                activities = activities.Select(a => new { a.Name, a.Category, a.ScheduledStart, a.ScheduledEnd, a.EstimatedCost })
            },
            RiskContext = new
            {
                weather = weather != null ? (object)new { weather.TemperatureC, weather.WindSpeedKph, weather.WeatherCode, weather.Location } : null
            },
            ReadinessContext = new
            {
                total = requirements.Count,
                completed = items.Count(i => i.Status == "COMPLETED")
            }
        };

        try
        {
            var json = JsonSerializer.Serialize(requestPayload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("/api/workflow/run", content);

            if (response.IsSuccessStatusCode)
            {
                var responseJson = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<AIWorkflowRunResponseDto>(
                    responseJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (result != null)
                {
                    return result;
                }
            }
            else
            {
                _logger.LogWarning("Python AI service responded with status {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not reach Python AI service on port 8000; using built-in deterministic fallback.");
        }

        // -----------------------------------------------------------------
        // SAFE FAILURE: Explicit Deterministic Fallback
        // (Invoked when Python AI microservice is unreachable or errors)
        // -----------------------------------------------------------------
        var totalBudget = budget?.TotalAmount ?? trip.BudgetAmount;
        var totalSpent = expenses.Sum(e => e.Amount);
        var remaining = totalBudget - totalSpent;

        return new AIWorkflowRunResponseDto
        {
            WorkflowId = workflowId,
            TripId = tripId,
            WorkflowStatus = "SAFE_FAILURE",
            ApprovalStatus = "PENDING",
            AgentTasks = new List<object>
            {
                new { agent = "budget", task = "Deterministic fallback budget analysis.", is_fallback = true },
                new { agent = "activity", task = "Deterministic fallback activity analysis.", is_fallback = true },
                new { agent = "risk", task = "Deterministic fallback safety analysis.", is_fallback = true },
                new { agent = "readiness", task = "Deterministic fallback readiness check.", is_fallback = true }
            },
            AgentResults = new Dictionary<string, object>
            {
                ["budget"] = new
                {
                    status = "FALLBACK_DETERMINISTIC",
                    trip_id = tripId,
                    is_fallback = true,
                    analysis = new
                    {
                        total_budget = totalBudget,
                        total_spent = totalSpent,
                        remaining_budget = remaining,
                        spending_percentage = totalBudget > 0 ? Math.Round((totalSpent / totalBudget) * 100, 2) : 0,
                        health = totalSpent < totalBudget ? "HEALTHY" : "OVERSPENT",
                        recommendation = "[FALLBACK] Spending is within initial budget limit. Verify before final approval.",
                        source = "FALLBACK_DETERMINISTIC_ENGINE"
                    }
                },
                ["activity"] = new
                {
                    status = "FALLBACK_DETERMINISTIC",
                    trip_id = tripId,
                    is_fallback = true,
                    analysis = new
                    {
                        activity_count = activities.Count,
                        recommendation = $"[FALLBACK] {activities.Count} activity(ies) planned. Schedule requires manual confirmation.",
                        source = "FALLBACK_DETERMINISTIC_ENGINE"
                    }
                },
                ["risk"] = new
                {
                    status = "FALLBACK_DETERMINISTIC",
                    trip_id = tripId,
                    is_fallback = true,
                    analysis = new
                    {
                        risk_score = 0,
                        risk_level = "LOW",
                        summary = "[FALLBACK] Baseline regional weather conditions applied.",
                        recommendation = "External AI service offline. Human reviewer must verify weather risk.",
                        source = "FALLBACK_DETERMINISTIC_ENGINE"
                    }
                },
                ["readiness"] = new
                {
                    status = "FALLBACK_DETERMINISTIC",
                    trip_id = tripId,
                    is_fallback = true,
                    analysis = new
                    {
                        readiness_score = requirements.Count > 0 ? (int)((items.Count(i => i.Status == "COMPLETED") / (double)requirements.Count) * 100) : 100,
                        readiness_level = "PARTIALLY_READY",
                        summary = "[FALLBACK] Deterministic checklist review.",
                        recommendation = "Review all required travel documents before departure.",
                        source = "FALLBACK_DETERMINISTIC_ENGINE"
                    }
                }
            },
            ValidationResults = new Dictionary<string, object>
            {
                ["passed"] = true,
                ["requires_approval"] = true,
                ["is_fallback"] = true,
                ["message"] = "External AI service was unavailable; safely fallen back to deterministic engine. Human review required."
            },
            Errors = new List<string>
            {
                "EXTERNAL_SERVICE_UNAVAILABLE: Python AI service on port 8000 was unreachable. Safe deterministic fallback data was provided for human reviewer inspection."
            }
        };
    }
}
