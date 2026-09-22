namespace TravelWise.API.DTOs;

public class TripBudgetSummaryDto
{
    public int TripId { get; set; }
    public int BudgetId { get; set; }
    public decimal TotalBudget { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal RemainingFunds { get; set; }
    public decimal ReturnReserve { get; set; }
    public decimal FoodBudget { get; set; }
    public decimal FoodSpent { get; set; }
    public decimal RemainingFoodBudget { get; set; }
    public decimal AccommodationBudget { get; set; }
    public decimal AccommodationSpent { get; set; }
    public decimal RemainingAccommodationBudget { get; set; }
    public decimal? NightlyAccommodationRate { get; set; }
    public int EstimatedNights { get; set; }
    public decimal SafeToSpend { get; set; }
    public string BudgetHealth { get; set; } = "HEALTHY";
    public decimal SpendingPercentage { get; set; }
    public decimal DailyBudget { get; set; }
    public decimal DailyFoodAllowance { get; set; }
    public decimal TotalFoodReserve { get; set; }
    public string BudgetStyle { get; set; } = "Balanced";
    public decimal SpendingVelocityPerDay { get; set; }
    public string Currency { get; set; } = "LKR";
    public List<BudgetCategorySummaryDto> CategoryAllocations { get; set; } = new();
    public List<ExpenseDetailsDto> RecentExpenses { get; set; } = new();
}

public class BudgetCategorySummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal AllocatedAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal PercentageUsed { get; set; }
}

public class UpdateAllocationsDto
{
    public List<CategoryAllocationItemDto> Categories { get; set; } = new();
}

public class CategoryAllocationItemDto
{
    public string Name { get; set; } = string.Empty;
    public decimal AllocatedAmount { get; set; }
}

public class UpdateFoodPlanDto
{
    public decimal FoodBudget { get; set; }
    public string? BudgetStyle { get; set; }
}

public class UpdateAccommodationPlanDto
{
    public decimal AccommodationBudget { get; set; }
    public decimal? NightlyRate { get; set; }
}

public class UpdateReturnReserveDto
{
    public decimal ReturnReserve { get; set; }
}
