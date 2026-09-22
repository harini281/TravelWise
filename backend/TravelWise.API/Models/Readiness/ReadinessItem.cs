namespace TravelWise.API.Models;

public class ReadinessItem
{
    public int Id { get; set; }

    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public int TravelRequirementId { get; set; }
    public TravelRequirement TravelRequirement { get; set; } = null!;

    public string Status { get; set; } = "PENDING";

    public DateTime? CompletedAt { get; set; }

    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}