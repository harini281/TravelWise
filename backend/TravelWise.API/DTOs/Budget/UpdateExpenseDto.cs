using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTOs;

public class UpdateExpenseDto
{
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    public string Description { get; set; } = string.Empty;

    public DateTime ExpenseDate { get; set; }

    [Required]
    public string PaymentMethod { get; set; } = string.Empty;
}