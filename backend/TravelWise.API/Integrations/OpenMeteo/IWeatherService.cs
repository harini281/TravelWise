using TravelWise.API.DTOs;

namespace TravelWise.API.Integrations.OpenMeteo;

public interface IWeatherService
{
    Task<WeatherResultDto?> GetCurrentWeatherAsync(string location);
    Task<(string ResolvedLocation, List<WeatherService.DailyForecastRecord> Forecast)> GetDailyForecastAsync(string location);
}
