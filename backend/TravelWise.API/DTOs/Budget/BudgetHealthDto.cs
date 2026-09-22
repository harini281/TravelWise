namespace TravelWise.API.DTOs;

public class BudgetHealthDto
{
    public int BudgetId { get; set; }

    public decimal TotalBudget { get; set; }

    public decimal TotalSpent { get; set; }

    public decimal RemainingBudget { get; set; }

    public decimal ReturnReserve { get; set; }

    public decimal FoodBudget { get; set; }

    public decimal RemainingFoodBudget { get; set; }

    public decimal AccommodationBudget { get; set; }

    public decimal RemainingAccommodationBudget { get; set; }

    public decimal SafeToSpend { get; set; }

    public decimal SpendingPercentage { get; set; }

    public string BudgetHealth { get; set; } = string.Empty;
}