using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTOs;

public class CreateExpenseDto
{
    [Range(1, int.MaxValue)]
    public int TripId { get; set; }

    [Range(1, int.MaxValue)]
    public int BudgetCategoryId { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public string Description { get; set; } = string.Empty;

    public DateTime ExpenseDate { get; set; }

    [Required]
    public string PaymentMethod { get; set; } = string.Empty;
}