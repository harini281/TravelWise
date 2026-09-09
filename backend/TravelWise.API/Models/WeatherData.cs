namespace TravelWise.API.Models;

public class WeatherData
{
    public int Id { get; set; }

    public int TripId { get; set; }
    public Trip Trip { get; set; } = null!;

    public string Location { get; set; } = string.Empty;

    public decimal TemperatureC { get; set; }

    public decimal WindSpeedKph { get; set; }

    public int WeatherCode { get; set; }

    public string Source { get; set; } = string.Empty;

    public bool IsAvailable { get; set; } = true;

    public DateTime RetrievedAt { get; set; } = DateTime.UtcNow;
}