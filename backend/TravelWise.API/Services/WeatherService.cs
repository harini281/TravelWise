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

        var encodedLocation = Uri.EscapeDataString(location);

        // -------------------------------------------------
        // STEP 1: Convert location name to latitude/longitude
        // -------------------------------------------------

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
            return null;
        }

        var geocodingJson =
            await geocodingResponse.Content.ReadAsStringAsync();

        using var geocodingDocument =
            JsonDocument.Parse(geocodingJson);

        if (!geocodingDocument.RootElement.TryGetProperty(
                "results",
                out var results))
        {
            return null;
        }

        if (results.GetArrayLength() == 0)
        {
            return null;
        }

        var firstResult = results[0];

        if (!firstResult.TryGetProperty(
                "latitude",
                out var latitudeElement))
        {
            return null;
        }

        if (!firstResult.TryGetProperty(
                "longitude",
                out var longitudeElement))
        {
            return null;
        }

        var latitude = latitudeElement.GetDouble();
        var longitude = longitudeElement.GetDouble();

        var resolvedLocation =
            firstResult.TryGetProperty(
                "name",
                out var nameElement)
                ? nameElement.GetString() ?? location
                : location;

        // -------------------------------------------------
        // STEP 2: Get current weather from Open-Meteo
        // -------------------------------------------------

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
            return null;
        }

        var weatherJson =
            await weatherResponse.Content.ReadAsStringAsync();

        using var weatherDocument =
            JsonDocument.Parse(weatherJson);

        if (!weatherDocument.RootElement.TryGetProperty(
                "current",
                out var current))
        {
            return null;
        }

        // -------------------------------------------------
        // STEP 3: Convert Open-Meteo response into our DTO
        // -------------------------------------------------

        if (!current.TryGetProperty(
                "temperature_2m",
                out var temperatureElement))
        {
            return null;
        }

        if (!current.TryGetProperty(
                "wind_speed_10m",
                out var windElement))
        {
            return null;
        }

        if (!current.TryGetProperty(
                "weather_code",
                out var weatherCodeElement))
        {
            return null;
        }

        return new WeatherResultDto
        {
            Location = resolvedLocation,

            TemperatureC =
                temperatureElement.GetDecimal(),

            WindSpeedKph =
                windElement.GetDecimal(),

            WeatherCode =
                weatherCodeElement.GetInt32(),

            Source = "Open-Meteo"
        };
    }
}