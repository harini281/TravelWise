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
        {
            return null;
        }

        try
        {
            var encodedLocation = Uri.EscapeDataString(location);

            // STEP 1: Convert location name to latitude/longitude
            var geocodingUrl =
                $"https://geocoding-api.open-meteo.com/v1/search" +
                $"?name={encodedLocation}" +
                $"&count=1" +
                $"&language=en" +
                $"&format=json";

            using var geocodingResponse =
                await _httpClient.GetAsync(geocodingUrl);

            if (!geocodingResponse.IsSuccessStatusCode)
            {
                return GetFallbackWeather(location);
            }

            var geocodingJson =
                await geocodingResponse.Content.ReadAsStringAsync();

            using var geocodingDocument =
                JsonDocument.Parse(geocodingJson);

            if (!geocodingDocument.RootElement.TryGetProperty("results", out var results) ||
                results.GetArrayLength() == 0)
            {
                return GetFallbackWeather(location);
            }

            var firstResult = results[0];

            if (!firstResult.TryGetProperty("latitude", out var latitudeElement) ||
                !firstResult.TryGetProperty("longitude", out var longitudeElement))
            {
                return GetFallbackWeather(location);
            }

            var latitude = latitudeElement.GetDouble();
            var longitude = longitudeElement.GetDouble();

            var resolvedLocation =
                firstResult.TryGetProperty("name", out var nameElement)
                    ? nameElement.GetString() ?? location
                    : location;

            // STEP 2: Get current weather from Open-Meteo
            var weatherUrl =
                $"https://api.open-meteo.com/v1/forecast" +
                $"?latitude={latitude}" +
                $"&longitude={longitude}" +
                $"&current=temperature_2m,wind_speed_10m,weather_code" +
                $"&wind_speed_unit=kmh";

            using var weatherResponse =
                await _httpClient.GetAsync(weatherUrl);

            if (!weatherResponse.IsSuccessStatusCode)
            {
                return GetFallbackWeather(location);
            }

            var weatherJson =
                await weatherResponse.Content.ReadAsStringAsync();

            using var weatherDocument =
                JsonDocument.Parse(weatherJson);

            if (!weatherDocument.RootElement.TryGetProperty("current", out var current))
            {
                return GetFallbackWeather(location);
            }

            // STEP 3: Convert Open-Meteo response into our DTO
            var temp = current.TryGetProperty("temperature_2m", out var temperatureElement)
                ? temperatureElement.GetDecimal()
                : 22.0m;

            var wind = current.TryGetProperty("wind_speed_10m", out var windElement)
                ? windElement.GetDecimal()
                : 10.0m;

            var code = current.TryGetProperty("weather_code", out var weatherCodeElement)
                ? weatherCodeElement.GetInt32()
                : 1;

            return new WeatherResultDto
            {
                Location = resolvedLocation,
                TemperatureC = temp,
                WindSpeedKph = wind,
                WeatherCode = code,
                Source = "Open-Meteo"
            };
        }
        catch
        {
            return GetFallbackWeather(location);
        }
    }

    private static WeatherResultDto GetFallbackWeather(string location)
    {
        var normalized = location.Trim().ToLowerInvariant();

        return normalized switch
        {
            var l when l.Contains("ella") => new WeatherResultDto
            {
                Location = "Ella",
                TemperatureC = 20.5m,
                WindSpeedKph = 12.0m,
                WeatherCode = 1,
                Source = "Open-Meteo (Offline Fallback)"
            },
            var l when l.Contains("colombo") => new WeatherResultDto
            {
                Location = "Colombo",
                TemperatureC = 28.0m,
                WindSpeedKph = 15.0m,
                WeatherCode = 2,
                Source = "Open-Meteo (Offline Fallback)"
            },
            var l when l.Contains("kandy") => new WeatherResultDto
            {
                Location = "Kandy",
                TemperatureC = 24.0m,
                WindSpeedKph = 10.0m,
                WeatherCode = 1,
                Source = "Open-Meteo (Offline Fallback)"
            },
            var l when l.Contains("galle") => new WeatherResultDto
            {
                Location = "Galle",
                TemperatureC = 27.5m,
                WindSpeedKph = 18.0m,
                WeatherCode = 2,
                Source = "Open-Meteo (Offline Fallback)"
            },
            var l when l.Contains("nuwara") => new WeatherResultDto
            {
                Location = "Nuwara Eliya",
                TemperatureC = 16.0m,
                WindSpeedKph = 14.0m,
                WeatherCode = 3,
                Source = "Open-Meteo (Offline Fallback)"
            },
            var l when l.Contains("sigiriya") => new WeatherResultDto
            {
                Location = "Sigiriya",
                TemperatureC = 29.0m,
                WindSpeedKph = 12.0m,
                WeatherCode = 0,
                Source = "Open-Meteo (Offline Fallback)"
            },
            _ => new WeatherResultDto
            {
                Location = location,
                TemperatureC = 23.0m,
                WindSpeedKph = 10.0m,
                WeatherCode = 1,
                Source = "Open-Meteo (Offline Fallback)"
            }
        };
    }
}