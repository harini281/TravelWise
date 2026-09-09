using System.Text.Json;
using TravelWise.API.DTOs;

namespace TravelWise.API.Services;

public class WeatherService
{
    private readonly HttpClient _httpClient;

    public WeatherService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<WeatherResultDto?> GetCurrentWeatherAsync(
        string location)
    {
        if (string.IsNullOrWhiteSpace(location))
            return null;

        var encodedLocation = Uri.EscapeDataString(location);

        var geocodingUrl =
            $"https://geocoding-api.open-meteo.com/v1/search" +
            $"?name={encodedLocation}&count=1&language=en&format=json";

        var geocodingResponse =
            await _httpClient.GetAsync(geocodingUrl);

        if (!geocodingResponse.IsSuccessStatusCode)
            return null;

        var geocodingJson =
            await geocodingResponse.Content.ReadAsStringAsync();

        using var geocodingDocument =
            JsonDocument.Parse(geocodingJson);

        if (!geocodingDocument.RootElement
                .TryGetProperty("results", out var results) ||
            results.GetArrayLength() == 0)
        {
            return null;
        }

        var firstResult = results[0];

        var latitude =
            firstResult.GetProperty("latitude").GetDouble();

        var longitude =
            firstResult.GetProperty("longitude").GetDouble();

        var resolvedLocation =
            firstResult.GetProperty("name").GetString()
            ?? location;

        var weatherUrl =
            $"https://api.open-meteo.com/v1/forecast" +
            $"?latitude={latitude}" +
            $"&longitude={longitude}" +
            $"&current=temperature_2m,wind_speed_10m,weather_code" +
            $"&wind_speed_unit=kmh";

        var weatherResponse =
            await _httpClient.GetAsync(weatherUrl);

        if (!weatherResponse.IsSuccessStatusCode)
            return null;

        var weatherJson =
            await weatherResponse.Content.ReadAsStringAsync();

        using var weatherDocument =
            JsonDocument.Parse(weatherJson);

        var current =
            weatherDocument.RootElement.GetProperty("current");

        return new WeatherResultDto
        {
            Location = resolvedLocation,

            TemperatureC = current
                .GetProperty("temperature_2m")
                .GetDecimal(),

            WindSpeedKph = current
                .GetProperty("wind_speed_10m")
                .GetDecimal(),

            WeatherCode = current
                .GetProperty("weather_code")
                .GetInt32(),

            Source = "Open-Meteo"
        };
    }
}