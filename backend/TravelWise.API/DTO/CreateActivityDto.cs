using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTOs;

public class CreateActivityDto
{
    [Range(1, int.MaxValue)]
    public int TripId { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Required]
    public string Location { get; set; } = string.Empty;

    [Range(0, double.MaxValue)]
    public decimal EstimatedCost { get; set; }

    [Range(1, int.MaxValue)]
    public int DurationMinutes { get; set; }

    public DateTime ScheduledStart { get; set; }

    public DateTime ScheduledEnd { get; set; }

    
}