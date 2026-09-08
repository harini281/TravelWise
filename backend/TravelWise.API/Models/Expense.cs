namespace TravelWise.API.Models;

public class Expense
{
    public int Id { get; set; }

    public int TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public int BudgetCategoryId { get; set; }

    public BudgetCategory BudgetCategory { get; set; } = null!;

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public DateTime ExpenseDate { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}