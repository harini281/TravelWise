using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using TravelWise.API.Services;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RiskController : ControllerBase
{
    private readonly TravelWiseDbContext _context;
    private readonly WeatherService _weatherService;

    public RiskController(
        TravelWiseDbContext context,
        WeatherService weatherService)
    {
        _context = context;
        _weatherService = weatherService;
    }


    // =========================================================
    // GET WEATHER
    // =========================================================

    [HttpGet("weather/trip/{tripId}")]
    public async Task<ActionResult<WeatherResultDto>>
        GetTripWeather(int tripId)
    {
        var trip = await _context.Trips
            .FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            return NotFound(
                $"Trip with ID {tripId} was not found.");
        }

        try
        {
            var weather =
                await _weatherService
                    .GetCurrentWeatherAsync(
                        trip.Destination);

            if (weather == null)
            {
                return StatusCode(
                    503,
                    "Weather information is currently unavailable.");
            }

            var weatherData = new WeatherData
            {
                TripId = tripId,

                Location = weather.Location,

                TemperatureC =
                    weather.TemperatureC,

                WindSpeedKph =
                    weather.WindSpeedKph,

                WeatherCode =
                    weather.WeatherCode,

                Source =
                    weather.Source,

                IsAvailable = true,

                RetrievedAt =
                    DateTime.UtcNow
            };

            _context.WeatherData.Add(weatherData);

            await _context.SaveChangesAsync();

            return Ok(weather);
        }
        catch (TaskCanceledException)
        {
            return StatusCode(
                504,
                "Weather service request timed out.");
        }
        catch (HttpRequestException)
        {
            return StatusCode(
                503,
                "Weather service is currently unavailable.");
        }
        catch (Exception)
        {
            return StatusCode(
                500,
                "An unexpected error occurred while retrieving weather information.");
        }
    }


    // =========================================================
    // ASSESS TRIP RISK
    // =========================================================

    [HttpPost("assess/trip/{tripId}")]
    public async Task<ActionResult<RiskAssessmentDto>>
        AssessTripRisk(int tripId)
    {
        var tripExists =
            await _context.Trips
                .AnyAsync(t => t.Id == tripId);

        if (!tripExists)
        {
            return NotFound(
                $"Trip with ID {tripId} was not found.");
        }

        var weather =
            await _context.WeatherData
                .Where(w =>
                    w.TripId == tripId &&
                    w.IsAvailable)
                .OrderByDescending(
                    w => w.RetrievedAt)
                .FirstOrDefaultAsync();

        if (weather == null)
        {
            return StatusCode(
                503,
                "Weather data is unavailable. " +
                "Risk assessment cannot be completed safely.");
        }


        // =====================================================
        // DETERMINISTIC RISK CALCULATION
        // =====================================================

        int riskScore = 0;


        // Temperature risk
        if (weather.TemperatureC >= 35 ||
            weather.TemperatureC <= 10)
        {
            riskScore += 20;
        }


        // Wind risk
        if (weather.WindSpeedKph >= 40)
        {
            riskScore += 35;
        }
        else if (weather.WindSpeedKph >= 25)
        {
            riskScore += 20;
        }


        // Weather condition risk
        if (weather.WeatherCode >= 95)
        {
            riskScore += 40;
        }
        else if (weather.WeatherCode >= 80)
        {
            riskScore += 25;
        }
        else if (weather.WeatherCode >= 51)
        {
            riskScore += 15;
        }


        riskScore =
            Math.Min(riskScore, 100);


        string riskLevel =
            riskScore switch
            {
                < 25 => "LOW",

                < 50 => "MODERATE",

                < 75 => "HIGH",

                _ => "CRITICAL"
            };


        string summary =
            riskLevel switch
            {
                "LOW" =>
                    "Current weather conditions indicate a low travel risk.",

                "MODERATE" =>
                    "Some weather conditions may affect the trip. " +
                    "Travellers should remain cautious.",

                "HIGH" =>
                    "Weather conditions may significantly affect " +
                    "planned activities. Safer alternatives should be considered.",

                "CRITICAL" =>
                    "Current conditions indicate serious travel risk. " +
                    "High-risk activities should not proceed without review.",

                _ =>
                    "Risk status could not be determined."
            };


        // =====================================================
        // SAVE RISK ASSESSMENT
        // =====================================================

        var assessment =
            new RiskAssessment
            {
                TripId =
                    tripId,

                RiskScore =
                    riskScore,

                RiskLevel =
                    riskLevel,

                Summary =
                    summary,

                AssessedAt =
                    DateTime.UtcNow
            };


        _context.RiskAssessments
            .Add(assessment);

        await _context
            .SaveChangesAsync();


        // =====================================================
        // RETURN RESULT
        // =====================================================

        var result =
            new RiskAssessmentDto
            {
                TripId =
                    tripId,

                RiskScore =
                    riskScore,

                RiskLevel =
                    riskLevel,

                Summary =
                    summary,

                TemperatureC =
                    weather.TemperatureC,

                WindSpeedKph =
                    weather.WindSpeedKph,

                WeatherCode =
                    weather.WeatherCode
            };


        return Ok(result);
    }
}