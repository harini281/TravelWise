using TravelWise.API.DTO;
using TravelWise.API.Models;

namespace TravelWise.API.Services.Budget;

public interface IBudgetCalculationService
{
    Task<TravelWise.API.Models.Budget> EnsureBudgetAndCategoriesForTripAsync(Trip trip);

    BudgetHealthDto CalculateBudgetHealth(
        Trip trip,
        TravelWise.API.Models.Budget budget,
        List<Expense> expenses,
        List<BudgetCategory> categories);

    TripBudgetSummaryDto BuildTripBudgetSummary(
        Trip trip,
        TravelWise.API.Models.Budget budget,
        List<Expense> expenses,
        List<BudgetCategory> categories);
}
