namespace TravelWise.API.Models;

public class BudgetCategory
{
    public int Id { get; set; }

    public int BudgetId { get; set; }

    public Budget Budget { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public decimal AllocatedAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}