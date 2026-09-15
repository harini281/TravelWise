using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BudgetsController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public BudgetsController(TravelWiseDbContext context)
    {
        _context = context;
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

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .ToListAsync();

        var totalSpent = expenses.Sum(e => e.Amount);
        if (trip.SpentAmount != totalSpent)
        {
            trip.SpentAmount = totalSpent;
            await _context.SaveChangesAsync();
        }

        var totalBudget = trip.BudgetAmount;
        var remainingBudget = totalBudget - totalSpent;
        var returnReserve = trip.ReturnBudgetReserve;
        var foodBudget = trip.FoodBudget;

        var foodCategory = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name == "Food");
        var foodCategoryId = foodCategory?.Id ?? 0;
        var foodSpent = expenses.Where(e => e.BudgetCategoryId == foodCategoryId).Sum(e => e.Amount);
        var remainingFoodBudget = Math.Max(0, foodBudget - foodSpent);

        var accommodationBudget = trip.AccommodationBudget;
        var accommodationCategory = await _context.BudgetCategories
            .FirstOrDefaultAsync(c => c.BudgetId == budget.Id && c.Name == "Accommodation");
        var accommodationCategoryId = accommodationCategory?.Id ?? 0;
        var accommodationSpent = expenses.Where(e => e.BudgetCategoryId == accommodationCategoryId).Sum(e => e.Amount);
        var remainingAccommodationBudget = Math.Max(0, accommodationBudget - accommodationSpent);

        // Safe to spend = Total Budget - Total Spent - Return Reserve - Remaining Food Budget
        var safeToSpend = totalBudget - totalSpent - returnReserve - remainingFoodBudget;

        var spendingPercentage = totalBudget > 0
            ? Math.Round((totalSpent / totalBudget) * 100, 2)
            : 0;

        string budgetHealth;
        if (totalBudget <= 0)
        {
            budgetHealth = "UNSET";
        }
        else if (totalSpent > totalBudget)
        {
            budgetHealth = "OVERSPENT";
        }
        else if (safeToSpend < 0)
        {
            budgetHealth = "WARNING";
        }
        else if (spendingPercentage >= 85)
        {
            budgetHealth = "WARNING";
        }
        else if (spendingPercentage >= 50)
        {
            budgetHealth = "MODERATE";
        }
        else
        {
            budgetHealth = "HEALTHY";
        }

        return Ok(new BudgetHealthDto
        {
            BudgetId = budget.Id,
            TotalBudget = totalBudget,
            TotalSpent = totalSpent,
            RemainingBudget = remainingBudget,
            ReturnReserve = returnReserve,
            FoodBudget = foodBudget,
            RemainingFoodBudget = remainingFoodBudget,
            AccommodationBudget = accommodationBudget,
            RemainingAccommodationBudget = remainingAccommodationBudget,
            SafeToSpend = safeToSpend,
            SpendingPercentage = spendingPercentage,
            BudgetHealth = budgetHealth
        });
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

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);

        var expenses = await _context.Expenses
            .Where(e => e.TripId == tripId)
            .OrderByDescending(e => e.ExpenseDate)
            .ToListAsync();

        var totalSpent = expenses.Sum(e => e.Amount);
        if (trip.SpentAmount != totalSpent)
        {
            trip.SpentAmount = totalSpent;
            await _context.SaveChangesAsync();
        }

        var categories = await _context.BudgetCategories
            .Where(c => c.BudgetId == budget.Id)
            .ToListAsync();

        var totalBudget = trip.BudgetAmount;
        var remainingFunds = totalBudget - totalSpent;
        var returnReserve = trip.ReturnBudgetReserve;
        var foodBudget = trip.FoodBudget;

        var foodCategory = categories.FirstOrDefault(c => c.Name == "Food");
        var foodSpent = foodCategory != null
            ? expenses.Where(e => e.BudgetCategoryId == foodCategory.Id).Sum(e => e.Amount)
            : 0m;
        var remainingFoodBudget = Math.Max(0, foodBudget - foodSpent);

        var accommodationBudget = trip.AccommodationBudget;
        var accommodationCategory = categories.FirstOrDefault(c => c.Name == "Accommodation");
        var accommodationSpent = accommodationCategory != null
            ? expenses.Where(e => e.BudgetCategoryId == accommodationCategory.Id).Sum(e => e.Amount)
            : 0m;
        var remainingAccommodationBudget = Math.Max(0, accommodationBudget - accommodationSpent);

        var safeToSpend = totalBudget - totalSpent - returnReserve - remainingFoodBudget;

        var spendingPercentage = totalBudget > 0
            ? Math.Round((totalSpent / totalBudget) * 100, 2)
            : 0;

        string budgetHealth;
        if (totalBudget <= 0)
        {
            budgetHealth = "UNSET";
        }
        else if (totalSpent > totalBudget)
        {
            budgetHealth = "OVERSPENT";
        }
        else if (safeToSpend < 0)
        {
            budgetHealth = "WARNING";
        }
        else if (spendingPercentage >= 85)
        {
            budgetHealth = "WARNING";
        }
        else if (spendingPercentage >= 50)
        {
            budgetHealth = "MODERATE";
        }
        else
        {
            budgetHealth = "HEALTHY";
        }

        int durationDays = Math.Max(1, (trip.ReturnDate.Date - trip.StartDate.Date).Days + 1);
        int estimatedNights = Math.Max(1, (trip.ReturnDate.Date - trip.StartDate.Date).Days);
        int travellers = Math.Max(1, trip.TravellerCount);

        decimal dailyBudget = durationDays > 0 ? Math.Round(totalBudget / durationDays, 2) : totalBudget;

        // Food Allowance calculations
        decimal dailyFoodAllowance = (durationDays * travellers) > 0 && foodBudget > 0
            ? Math.Round(foodBudget / (durationDays * travellers), 2)
            : 0;

        // Spending velocity
        decimal velocity = totalSpent > 0 ? Math.Round(totalSpent / durationDays, 2) : 0;

        var categorySummaries = categories.Select(c =>
        {
            var catSpent = expenses.Where(e => e.BudgetCategoryId == c.Id).Sum(e => e.Amount);
            var catRemaining = Math.Max(0, c.AllocatedAmount - catSpent);
            var catPct = c.AllocatedAmount > 0
                ? Math.Round((catSpent / c.AllocatedAmount) * 100, 1)
                : 0;
            return new BudgetCategorySummaryDto
            {
                Id = c.Id,
                Name = c.Name,
                AllocatedAmount = c.AllocatedAmount,
                SpentAmount = catSpent,
                RemainingAmount = catRemaining,
                PercentageUsed = (decimal)catPct
            };
        }).ToList();

        var recentExpenseDtos = expenses.Take(10).Select(e => new ExpenseDetailsDto
        {
            Id = e.Id,
            BudgetCategoryId = e.BudgetCategoryId,
            Amount = e.Amount,
            Description = e.Description,
            ExpenseDate = e.ExpenseDate,
            PaymentMethod = e.PaymentMethod
        }).ToList();

        var result = new TripBudgetSummaryDto
        {
            TripId = trip.Id,
            BudgetId = budget.Id,
            TotalBudget = totalBudget,
            TotalSpent = totalSpent,
            RemainingFunds = remainingFunds,
            ReturnReserve = returnReserve,
            FoodBudget = foodBudget,
            FoodSpent = foodSpent,
            RemainingFoodBudget = remainingFoodBudget,
            AccommodationBudget = accommodationBudget,
            AccommodationSpent = accommodationSpent,
            RemainingAccommodationBudget = remainingAccommodationBudget,
            NightlyAccommodationRate = trip.NightlyAccommodationRate,
            EstimatedNights = estimatedNights,
            SafeToSpend = safeToSpend,
            BudgetHealth = budgetHealth,
            SpendingPercentage = (decimal)spendingPercentage,
            DailyBudget = dailyBudget,
            DailyFoodAllowance = dailyFoodAllowance,
            TotalFoodReserve = foodBudget,
            BudgetStyle = "Balanced",
            SpendingVelocityPerDay = velocity,
            Currency = budget.Currency,
            CategoryAllocations = categorySummaries,
            RecentExpenses = recentExpenseDtos
        };

        return Ok(result);
    }

    // ----------------------------------------------------------------------
    // UPDATE CATEGORY ALLOCATIONS: /api/Budgets/trip/{tripId}/allocations
    // ----------------------------------------------------------------------
    [HttpPut("trip/{tripId}/allocations")]
    public async Task<ActionResult<TripBudgetSummaryDto>> UpdateAllocations(int tripId, [FromBody] UpdateAllocationsDto dto)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);
        if (trip == null) return NotFound($"Trip with ID {tripId} was not found.");

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);
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

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);
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

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);
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

        var budget = await EnsureBudgetAndCategoriesForTrip(trip);
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

    // ----------------------------------------------------------------------
    // HELPER: Ensure Budget and Standard Categories exist for a Trip
    // ----------------------------------------------------------------------
    private async Task<Budget> EnsureBudgetAndCategoriesForTrip(Trip trip)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == trip.Id);
        int durationDays = Math.Max(1, (trip.ReturnDate.Date - trip.StartDate.Date).Days + 1);

        if (budget == null)
        {
            budget = new Budget
            {
                TripId = trip.Id,
                TotalAmount = trip.BudgetAmount,
                Currency = "LKR",
                DailyBudget = durationDays > 0 ? Math.Round(trip.BudgetAmount / durationDays, 2) : trip.BudgetAmount,
                BudgetStatus = trip.BudgetAmount > 0 ? "HEALTHY" : "UNSET",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Budgets.Add(budget);
            await _context.SaveChangesAsync();
        }
        else if (budget.TotalAmount != trip.BudgetAmount)
        {
            budget.TotalAmount = trip.BudgetAmount;
            budget.DailyBudget = durationDays > 0 ? Math.Round(trip.BudgetAmount / durationDays, 2) : trip.BudgetAmount;
            budget.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        var existingCategories = await _context.BudgetCategories
            .Where(c => c.BudgetId == budget.Id)
            .ToListAsync();

        var standardNames = new[]
        {
            "Transport",
            "Accommodation",
            "Food",
            "Activities",
            "Emergency",
            "Return Journey",
            "Other"
        };

        bool addedAny = false;
        foreach (var name in standardNames)
        {
            if (!existingCategories.Any(c => c.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
            {
                decimal initialAlloc = name switch
                {
                    "Accommodation" => trip.AccommodationBudget > 0 ? trip.AccommodationBudget : Math.Round(trip.BudgetAmount * 0.30m, 2),
                    "Food" => trip.FoodBudget > 0 ? trip.FoodBudget : Math.Round(trip.BudgetAmount * 0.20m, 2),
                    "Transport" => Math.Round(trip.BudgetAmount * 0.20m, 2),
                    "Activities" => Math.Round(trip.BudgetAmount * 0.15m, 2),
                    "Return Journey" => trip.ReturnBudgetReserve > 0 ? trip.ReturnBudgetReserve : Math.Round(trip.BudgetAmount * 0.10m, 2),
                    "Emergency" => Math.Round(trip.BudgetAmount * 0.05m, 2),
                    _ => 0m
                };

                _context.BudgetCategories.Add(new BudgetCategory
                {
                    BudgetId = budget.Id,
                    Name = name,
                    AllocatedAmount = initialAlloc,
                    CreatedAt = DateTime.UtcNow
                });
                addedAny = true;
            }
        }

        if (addedAny)
        {
            await _context.SaveChangesAsync();
        }

        return budget;
    }
}