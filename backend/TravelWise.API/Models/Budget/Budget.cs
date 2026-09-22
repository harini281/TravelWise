namespace TravelWise.API.Models;

public class Budget
{
    
    public int Id { get; set; }

    public int TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public decimal TotalAmount { get; set; }

    public string Currency { get; set; } = "LKR";

    public decimal DailyBudget { get; set; }

    public string BudgetStatus { get; set; } = "HEALTHY";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}