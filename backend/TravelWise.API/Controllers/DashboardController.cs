using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;

namespace TravelWise.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DashboardController(TravelWiseDbContext db) : ControllerBase
{
    // A read-only snapshot: visiting a dashboard must not create budgets or assessments.
    [HttpGet("trip/{tripId:int}")]
    public async Task<IActionResult> GetTrip(int tripId, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.AsNoTracking().SingleOrDefaultAsync(t => t.Id == tripId, cancellationToken);
        if (trip == null) return NotFound();
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        if (trip.UserId != userId && !User.IsInRole("Admin")) return Forbid();

        var expenses = await db.Expenses.AsNoTracking().Where(e => e.TripId == tripId)
            .Select(e => new { e.Amount, Category = e.BudgetCategory.Name }).ToListAsync(cancellationToken);
        var spent = expenses.Sum(e => e.Amount);
        var foodSpent = expenses.Where(e => e.Category.Equals("Food", StringComparison.OrdinalIgnoreCase)).Sum(e => e.Amount);
        var remainingFood = Math.Max(0, trip.FoodBudget - foodSpent);
        var safeToSpend = trip.BudgetAmount - spent - trip.ReturnBudgetReserve - remainingFood;
        var health = trip.BudgetAmount <= 0 ? "UNSET" : spent > trip.BudgetAmount ? "OVERSPENT"
            : safeToSpend < 0 || spent >= trip.BudgetAmount * .85m ? "WARNING"
            : spent >= trip.BudgetAmount * .5m ? "MODERATE" : "HEALTHY";
        var activities = await db.Activities.AsNoTracking().Where(a => a.TripId == tripId)
            .OrderBy(a => a.ScheduledStart).Select(a => new { a.Id, a.Name, a.Category, a.Location,
                a.ScheduledStart, a.ScheduledEnd, a.EstimatedCost, a.Status }).ToListAsync(cancellationToken);
        var requirements = await db.TravelRequirements.AsNoTracking().Where(r => r.TripId == tripId && r.IsRequired)
            .Select(r => r.Id).ToListAsync(cancellationToken);
        var completedRequirements = await db.ReadinessItems.AsNoTracking()
            .Where(i => i.TripId == tripId && i.Status == "COMPLETED" && requirements.Contains(i.TravelRequirementId))
            .Select(i => i.TravelRequirementId).Distinct().CountAsync(cancellationToken);
        var weather = await db.WeatherData.AsNoTracking().Where(w => w.TripId == tripId)
            .OrderByDescending(w => w.RetrievedAt).Select(w => new { w.TemperatureC, w.WindSpeedKph, w.WeatherCode,
                w.Source, w.IsAvailable, w.RetrievedAt }).FirstOrDefaultAsync(cancellationToken);
        var risk = await db.RiskAssessments.AsNoTracking().Where(r => r.TripId == tripId)
            .OrderByDescending(r => r.AssessedAt).Select(r => new { r.RiskLevel, r.RiskScore, r.Summary, r.AssessedAt })
            .FirstOrDefaultAsync(cancellationToken);
        var workflow = await db.AIWorkflows.AsNoTracking().Where(w => w.TripId == tripId)
            .OrderByDescending(w => w.CreatedAt).Select(w => new { w.Id, w.Status, w.ApprovalStatus, w.ValidationPassed,
                w.ApprovalComment, w.CreatedAt, w.UpdatedAt }).FirstOrDefaultAsync(cancellationToken);

        return Ok(new {
            trip, capturedAt = DateTime.UtcNow,
            budget = new { allocated = trip.BudgetAmount, spent, remainingFood, returnReserve = trip.ReturnBudgetReserve,
                safeToSpend, health, expenseCount = expenses.Count },
            activities, readiness = new { total = requirements.Count, completed = completedRequirements },
            weather, risk, workflow
        });
    }
}
