namespace TravelWise.API.Models;

public class Activity
{
    public int Id { get; set; }

    public int TripId { get; set; }

    public Trip Trip { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public decimal EstimatedCost { get; set; }

    public int DurationMinutes { get; set; }

    public DateTime ScheduledStart { get; set; }

    public DateTime ScheduledEnd { get; set; }

    public string Status { get; set; } = "PLANNED";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}