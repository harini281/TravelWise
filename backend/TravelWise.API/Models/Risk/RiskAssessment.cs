namespace TravelWise.API.Models;

public class RiskAssessment
{
    public int Id { get; set; }

    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public string RiskLevel { get; set; } = "LOW";

    public int RiskScore { get; set; }

    public string Summary { get; set; } = string.Empty;

    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
}