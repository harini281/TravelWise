namespace TravelWise.API.DTOs;

public class BudgetDetailsDto
{
    public int Id { get; set; }

    public int TripId { get; set; }

    public decimal TotalAmount { get; set; }

    public string Currency { get; set; } = string.Empty;

    public decimal DailyBudget { get; set; }

    public string BudgetStatus { get; set; } = string.Empty;

    public List<BudgetCategoryDetailsDto> Categories { get; set; } = new();

    public List<ExpenseDetailsDto> Expenses { get; set; } = new();
}

public class BudgetCategoryDetailsDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal AllocatedAmount { get; set; }
}

public class ExpenseDetailsDto
{
    public int Id { get; set; }

    public int BudgetCategoryId { get; set; }

    public decimal Amount { get; set; }

    public string Description { get; set; } = string.Empty;

    public DateTime ExpenseDate { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;
}