namespace TravelWise.API.DTOs;

public class WeatherResultDto
{
    public string Location { get; set; } = string.Empty;

    public decimal TemperatureC { get; set; }

    public decimal WindSpeedKph { get; set; }

    public int WeatherCode { get; set; }

    public string Source { get; set; } = "Open-Meteo";
}