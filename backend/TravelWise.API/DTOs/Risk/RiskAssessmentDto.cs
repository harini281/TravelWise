namespace TravelWise.API.DTOs;

public class RiskAssessmentDto
{
    public int TripId { get; set; }

    public int RiskScore { get; set; }

    public string RiskLevel { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

    public decimal TemperatureC { get; set; }

    public decimal WindSpeedKph { get; set; }

    public int WeatherCode { get; set; }
}