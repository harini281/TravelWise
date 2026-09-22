using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTO;
using TravelWise.API.Models;

namespace TravelWise.API.Services.Budget;

public class BudgetCalculationService : IBudgetCalculationService
{
    private readonly TravelWiseDbContext _context;

    public BudgetCalculationService(TravelWiseDbContext context)
    {
        _context = context;
    }

    public async Task<TravelWise.API.Models.Budget> EnsureBudgetAndCategoriesForTripAsync(Trip trip)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == trip.Id);
        int durationDays = Math.Max(1, (trip.ReturnDate.Date - trip.StartDate.Date).Days + 1);

        if (budget == null)
        {
            budget = new TravelWise.API.Models.Budget
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

    public BudgetHealthDto CalculateBudgetHealth(
        Trip trip,
        TravelWise.API.Models.Budget budget,
        List<Expense> expenses,
        List<BudgetCategory> categories)
    {
        var totalSpent = expenses.Sum(e => e.Amount);
        var totalBudget = trip.BudgetAmount;
        var remainingBudget = totalBudget - totalSpent;
        var returnReserve = trip.ReturnBudgetReserve;
        var foodBudget = trip.FoodBudget;

        var foodCategory = categories.FirstOrDefault(c => c.Name == "Food");
        var foodCategoryId = foodCategory?.Id ?? 0;
        var foodSpent = expenses.Where(e => e.BudgetCategoryId == foodCategoryId).Sum(e => e.Amount);
        var remainingFoodBudget = Math.Max(0, foodBudget - foodSpent);

        var accommodationBudget = trip.AccommodationBudget;
        var accommodationCategory = categories.FirstOrDefault(c => c.Name == "Accommodation");
        var accommodationCategoryId = accommodationCategory?.Id ?? 0;
        var accommodationSpent = expenses.Where(e => e.BudgetCategoryId == accommodationCategoryId).Sum(e => e.Amount);
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

        return new BudgetHealthDto
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
        };
    }

    public TripBudgetSummaryDto BuildTripBudgetSummary(
        Trip trip,
        TravelWise.API.Models.Budget budget,
        List<Expense> expenses,
        List<BudgetCategory> categories)
    {
        var totalSpent = expenses.Sum(e => e.Amount);
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

        decimal dailyFoodAllowance = (durationDays * travellers) > 0 && foodBudget > 0
            ? Math.Round(foodBudget / (durationDays * travellers), 2)
            : 0;

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

        return new TripBudgetSummaryDto
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
    }
}
