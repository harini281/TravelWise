using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTO;
using TravelWise.API.Models;
using TravelWise.API.Services.Budget;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetsController : ControllerBase
{
    private readonly TravelWiseDbContext _context;
    private readonly IBudgetCalculationService _budgetCalculationService;

    public BudgetsController(
        TravelWiseDbContext context,
        IBudgetCalculationService? budgetCalculationService = null)
    {
        _context = context;
        _budgetCalculationService = budgetCalculationService ?? new BudgetCalculationService(context);
    }

    [HttpPost]
    public async Task<ActionResult<Budget>> CreateBudget(CreateBudgetDto dto)
    {
        var tripExists = await _context.Trips.AnyAsync(t => t.Id == dto.TripId);

        if (!tripExists)
        {
            return NotFound($"Trip with ID {dto.TripId} was not found.");
        }

        var budget = new Budget
        {
            TripId = dto.TripId,
            TotalAmount = dto.TotalAmount,
            Currency = dto.Currency,
            DailyBudget = dto.DailyBudget
        };

        _context.Budgets.Add(budget);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(CreateBudget), new { id = budget.Id }, budget);
    }

    [HttpGet("{id}/health")]
    public async Task<ActionResult<BudgetHealthDto>> GetBudgetHealth(int id)
    {
        var budget = await _context.Budgets.FindAsync(id);

        if (budget == null)
        {
            // Fallback: check if id is a TripId
            var tripBudget = await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == id);
            if (tripBudget != null)
            {
                return await GetTripBudgetHealth(id);
            }
            return NotFound($"Budget with ID {id} was not found.");
        }

        return await GetTripBudgetHealth(budget.TripId);
    }

    // ----------------------------------------------------------------------
    // GET TRIP BUDGET HEALTH: /api/Budgets/trip/{tripId}/health
    // ----------------------------------------------------------------------
    [HttpGet("trip/{tripId}/health")]
    public async Task<ActionResult<BudgetHealthDto>> GetTripBudgetHealth(int tripId)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null)
        {
            return NotFound($"Trip with ID {tripId} was not found.");
        }

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .ToListAsync();

        var categories = await _context.BudgetCategories
            .Where(c => c.BudgetId == budget.Id)
            .ToListAsync();

        var totalSpent = expenses.Sum(e => e.Amount);
        if (trip.SpentAmount != totalSpent)
        {
            trip.SpentAmount = totalSpent;
            await _context.SaveChangesAsync();
        }

        var healthDto = _budgetCalculationService.CalculateBudgetHealth(trip, budget, expenses, categories);
        return Ok(healthDto);
    }

    // ----------------------------------------------------------------------
    // GET TRIP BUDGET SUMMARY: /api/Budgets/trip/{tripId}/summary
    // ----------------------------------------------------------------------
    [HttpGet("trip/{tripId}/summary")]
    public async Task<ActionResult<TripBudgetSummaryDto>> GetTripBudgetSummary(int tripId)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null)
        {
            return NotFound($"Trip with ID {tripId} was not found.");
        }

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .OrderByDescending(e => e.ExpenseDate)
            .ToListAsync();

        var categories = await _context.BudgetCategories
            .Where(c => c.BudgetId == budget.Id)
            .ToListAsync();

        var totalSpent = expenses.Sum(e => e.Amount);
        if (trip.SpentAmount != totalSpent)
        {
            trip.SpentAmount = totalSpent;
            await _context.SaveChangesAsync();
        }

        var summaryDto = _budgetCalculationService.BuildTripBudgetSummary(trip, budget, expenses, categories);
        return Ok(summaryDto);
    }

    // ----------------------------------------------------------------------
    // UPDATE CATEGORY ALLOCATIONS: /api/Budgets/trip/{tripId}/allocations
    // ----------------------------------------------------------------------
    [HttpPut("trip/{tripId}/allocations")]
    public async Task<ActionResult<TripBudgetSummaryDto>> UpdateAllocations(int tripId, [FromBody] UpdateAllocationsDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound($"Trip with ID {tripId} was not found.");

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);
        var categories = await _context.BudgetCategories.Where(c => c.BudgetId == budget.Id).ToListAsync();

        foreach (var item in dto.Categories)
        {
            var cat = categories.FirstOrDefault(c => c.Name.Equals(item.Name, StringComparison.OrdinalIgnoreCase));
            if (cat != null)
            {
                cat.AllocatedAmount = Math.Max(0, item.AllocatedAmount);
            }
            else
            {
                _context.BudgetCategories.Add(new BudgetCategory
                {
                    BudgetId = budget.Id,
                    Name = item.Name,
                    AllocatedAmount = Math.Max(0, item.AllocatedAmount)
                });
            }
        }

        await _context.SaveChangesAsync();
        return await GetTripBudgetSummary(tripId);
    }

    // ----------------------------------------------------------------------
    // UPDATE FOOD PLAN: /api/Budgets/trip/{tripId}/food-plan
    // ----------------------------------------------------------------------
    [HttpPut("trip/{tripId}/food-plan")]
    public async Task<ActionResult<TripBudgetSummaryDto>> UpdateFoodPlan(int tripId, [FromBody] UpdateFoodPlanDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound($"Trip with ID {tripId} was not found.");

        trip.FoodBudget = Math.Max(0, dto.FoodBudget);

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);
        var foodCategory = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name == "Food");
        if (foodCategory != null)
        {
            foodCategory.AllocatedAmount = trip.FoodBudget;
        }

        await _context.SaveChangesAsync();
        return await GetTripBudgetSummary(tripId);
    }

    // ----------------------------------------------------------------------
    // UPDATE ACCOMMODATION PLAN: /api/Budgets/trip/{tripId}/accommodation-plan
    // ----------------------------------------------------------------------
    [HttpPut("trip/{tripId}/accommodation-plan")]
    public async Task<ActionResult<TripBudgetSummaryDto>> UpdateAccommodationPlan(int tripId, [FromBody] UpdateAccommodationPlanDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound($"Trip with ID {tripId} was not found.");

        trip.AccommodationBudget = Math.Max(0, dto.AccommodationBudget);
        if (dto.NightlyRate.HasValue)
        {
            trip.NightlyAccommodationRate = Math.Max(0, dto.NightlyRate.Value);
        }

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);
        var accCategory = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name == "Accommodation");
        if (accCategory != null)
        {
            accCategory.AllocatedAmount = trip.AccommodationBudget;
        }

        await _context.SaveChangesAsync();
        return await GetTripBudgetSummary(tripId);
    }

    // ----------------------------------------------------------------------
    // UPDATE RETURN RESERVE: /api/Budgets/trip/{tripId}/return-reserve
    // ----------------------------------------------------------------------
    [HttpPut("trip/{tripId}/return-reserve")]
    public async Task<ActionResult<TripBudgetSummaryDto>> UpdateReturnReserve(int tripId, [FromBody] UpdateReturnReserveDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound($"Trip with ID {tripId} was not found.");

        trip.ReturnBudgetReserve = Math.Max(0, dto.ReturnReserve);

        var budget = await _budgetCalculationService.EnsureBudgetAndCategoriesForTripAsync(trip);
        var returnCategory = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name == "Return Journey");
        if (returnCategory != null)
        {
            returnCategory.AllocatedAmount = trip.ReturnBudgetReserve;
        }

        await _context.SaveChangesAsync();
        return await GetTripBudgetSummary(tripId);
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult<BudgetDetailsDto>> GetBudgetDetails(int id)
    {
        var budget = await _context.Budgets.FindAsync(id);
        if (budget == null)
        {
            return NotFound($"Budget with ID {id} was not found.");
        }

        var categories = await _context.BudgetCategories
            .Where(c => c.BudgetId == id)
            .Select(c => new BudgetCategoryDetailsDto
            {
                Id = c.Id,
                Name = c.Name,
                AllocatedAmount = c.AllocatedAmount
            })
            .ToListAsync();

        var expenses = await _context.Expenses
            .Where(e => e.TripId == budget.TripId)
            .Select(e => new ExpenseDetailsDto
            {
                Id = e.Id,
                BudgetCategoryId = e.BudgetCategoryId,
                Amount = e.Amount,
                Description = e.Description,
                ExpenseDate = e.ExpenseDate,
                PaymentMethod = e.PaymentMethod
            })
            .ToListAsync();

        return Ok(new BudgetDetailsDto
        {
            Id = budget.Id,
            TripId = budget.TripId,
            TotalAmount = budget.TotalAmount,
            Currency = budget.Currency,
            DailyBudget = budget.DailyBudget,
            BudgetStatus = budget.BudgetStatus,
            Categories = categories,
            Expenses = expenses
        });
    }
}