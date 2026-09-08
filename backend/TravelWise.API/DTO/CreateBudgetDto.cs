using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTOs;

public class CreateBudgetDto
{
    [Range(1, int.MaxValue)]
    public int TripId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal TotalAmount { get; set; }

    [Required]
    public string Currency { get; set; } = "LKR";

    [Range(0.01, double.MaxValue)]
    public decimal DailyBudget { get; set; }
}
public class CreateBudgetCategoryDto
{
    [Range(1, int.MaxValue)]
    public int BudgetId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue)]
    public decimal AllocatedAmount { get; set; }
}