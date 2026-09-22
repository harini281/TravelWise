namespace TravelWise.API.DTOs;

public class ReadinessAssessmentDto
{
    public int TripId { get; set; }
    public int ReadinessScore { get; set; }
    public string ReadinessLevel { get; set; } = string.Empty;
    public int TotalRequirements { get; set; }
    public int CompletedRequirements { get; set; }
    public int MissingRequirements { get; set; }
    public string Summary { get; set; } = string.Empty;
}