using TravelWise.API.DTO;
using TravelWise.API.DTOs;
using TravelWise.API.Integrations.OpenMeteo;
using TravelWise.API.Models;

namespace TravelWise.API.Services.Risk;

public interface IRiskAdvisoryService
{
    WeatherAdvisoryDto EvaluateWeatherAdvisory(WeatherResultDto weather, string? tripType, string? interests);

    WeatherDatePlanningDto EvaluateForecastPlanning(
        string resolvedLoc,
        List<WeatherService.DailyForecastRecord> forecast,
        DateTime sDate,
        DateTime rDate,
        string? tripType,
        string? interests);

    (int RiskScore, string RiskLevel, string Summary) CalculateTripRisk(WeatherData weather);
}
