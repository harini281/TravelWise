namespace TravelWise.API.Models;

public class ReadinessAssessment
{
    public int Id { get; set; }

    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public int ReadinessScore { get; set; }

    public string ReadinessLevel { get; set; } = "NOT_READY";

    public int TotalRequirements { get; set; }

    public int CompletedRequirements { get; set; }

    public int MissingRequirements { get; set; }

    public string Summary { get; set; } = string.Empty;

    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
}