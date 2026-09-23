using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTO;
using TravelWise.API.DTOs;
using TravelWise.API.Integrations.OpenMeteo;
using TravelWise.API.Models;
using TravelWise.API.Services.Risk;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RiskController : ControllerBase
{
    private readonly TravelWiseDbContext _context;
    private readonly IWeatherService _weatherService;
    private readonly IRiskAdvisoryService _riskAdvisoryService;

    public RiskController(
        TravelWiseDbContext context,
        IWeatherService weatherService,
        IRiskAdvisoryService riskAdvisoryService)
    {
        _context = context;
        _weatherService = weatherService;
        _riskAdvisoryService = riskAdvisoryService;
    }

    // Retained for type compatibility with existing tests and clients
    public class WeatherAdvisoryDto : TravelWise.API.DTOs.WeatherAdvisoryDto { }
    public class WeatherDatePlanningDto : TravelWise.API.DTOs.WeatherDatePlanningDto { }
    public class AlternativeDateOptionDto : TravelWise.API.DTOs.AlternativeDateOptionDto { }

    // =========================================================
    // GET LOCATION WEATHER ADVISORY & DETERMINISTIC SAFETY RULES
    // =========================================================

    [HttpGet("weather")]
    public async Task<ActionResult<WeatherAdvisoryDto>> GetLocationWeatherAdvisory(
        [FromQuery] string location,
        [FromQuery] string? tripType = null,
        [FromQuery] string? interests = null)
    {
        if (string.IsNullOrWhiteSpace(location))
        {
            return BadRequest("Location query parameter is required.");
        }

        try
        {
            var weather = await _weatherService.GetCurrentWeatherAsync(location);
            if (weather == null)
            {
                return StatusCode(503, "Weather information is currently unavailable.");
            }

            var advisory = _riskAdvisoryService.EvaluateWeatherAdvisory(weather, tripType, interests);

            return Ok(new WeatherAdvisoryDto
            {
                Location = advisory.Location,
                TemperatureC = advisory.TemperatureC,
                WindSpeedKph = advisory.WindSpeedKph,
                WeatherCode = advisory.WeatherCode,
                WeatherCondition = advisory.WeatherCondition,
                Source = advisory.Source,
                PackingChecklist = advisory.PackingChecklist,
                SafetyRules = advisory.SafetyRules,
                RiskLevel = advisory.RiskLevel,
                HighRiskCaution = advisory.HighRiskCaution
            });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, "Weather service request timed out.");
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, "Weather service is currently unavailable.");
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred while retrieving weather advisory.");
        }
    }

    // =========================================================
    // WEATHER-AWARE DATE PLANNING & ALTERNATIVE DATE DISCOVERY
    // =========================================================

    [HttpGet("weather/forecast")]
    public async Task<ActionResult<WeatherDatePlanningDto>> GetWeatherForecastAndPlanning(
        [FromQuery] string location,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? returnDate = null,
        [FromQuery] string? tripType = null,
        [FromQuery] string? interests = null)
    {
        if (string.IsNullOrWhiteSpace(location))
        {
            return BadRequest("Location query parameter is required.");
        }

        var (resolvedLoc, forecast) = await _weatherService.GetDailyForecastAsync(location);

        DateTime sDate = startDate ?? DateTime.UtcNow.Date;
        DateTime rDate = returnDate ?? sDate.AddDays(3);
        if (rDate < sDate) rDate = sDate;

        var planning = _riskAdvisoryService.EvaluateForecastPlanning(resolvedLoc, forecast, sDate, rDate, tripType, interests);

        return Ok(new WeatherDatePlanningDto
        {
            Location = planning.Location,
            IsForecastAvailable = planning.IsForecastAvailable,
            ForecastMessage = planning.ForecastMessage,
            IsSeasonalGeneralInfo = planning.IsSeasonalGeneralInfo,
            SeasonalLabel = planning.SeasonalLabel,
            SeasonalSummary = planning.SeasonalSummary,
            PlannedStartDate = planning.PlannedStartDate,
            PlannedReturnDate = planning.PlannedReturnDate,
            IsPlannedWeatherSuitable = planning.IsPlannedWeatherSuitable,
            PlannedWeatherSummary = planning.PlannedWeatherSummary,
            PlannedWeatherRiskScore = planning.PlannedWeatherRiskScore,
            PlannedWeatherRiskLevel = planning.PlannedWeatherRiskLevel,
            UnsuitableReasons = planning.UnsuitableReasons,
            AlternativeDateSuggestions = planning.AlternativeDateSuggestions,
            PackingRecommendations = planning.PackingRecommendations,
            SafeActivityCategories = planning.SafeActivityCategories,
            RestrictedActivityCategories = planning.RestrictedActivityCategories,
            ActivitySafetyAdvice = planning.ActivitySafetyAdvice
        });
    }

    // =========================================================
    // GET WEATHER FOR TRIP
    // =========================================================

    [HttpGet("weather/trip/{tripId}")]
    public async Task<ActionResult<WeatherResultDto>> GetTripWeather(int tripId)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            return NotFound($"Trip with ID {tripId} was not found.");
        }

        try
        {
            var weather = await _weatherService.GetCurrentWeatherAsync(trip.Destination);

            if (weather == null)
            {
                return StatusCode(503, "Weather information is currently unavailable.");
            }

            var weatherData = new WeatherData
            {
                TripId = tripId,
                Location = weather.Location,
                TemperatureC = weather.TemperatureC,
                WindSpeedKph = weather.WindSpeedKph,
                WeatherCode = weather.WeatherCode,
                Source = weather.Source,
                IsAvailable = true,
                RetrievedAt = DateTime.UtcNow
            };

            _context.WeatherData.Add(weatherData);
            await _context.SaveChangesAsync();

            return Ok(weather);
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, "Weather service request timed out.");
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, "Weather service is currently unavailable.");
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred while retrieving weather information.");
        }
    }

    // =========================================================
    // ASSESS TRIP RISK
    // =========================================================

    [HttpPost("assess/trip/{tripId}")]
    public async Task<ActionResult<RiskAssessmentDto>> AssessTripRisk(int tripId)
    {
        var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
        {
            return NotFound($"Trip with ID {tripId} was not found.");
        }

        var weather = await _context.WeatherData
            .Where(w => w.TripId == tripId && w.IsAvailable)
            .OrderByDescending(w => w.RetrievedAt)
            .FirstOrDefaultAsync();

        if (weather == null)
        {
            var weatherResult = await _weatherService.GetCurrentWeatherAsync(trip.Destination);

            if (weatherResult != null)
            {
                weather = new WeatherData
                {
                    TripId = tripId,
                    Location = weatherResult.Location,
                    TemperatureC = weatherResult.TemperatureC,
                    WindSpeedKph = weatherResult.WindSpeedKph,
                    WeatherCode = weatherResult.WeatherCode,
                    Source = weatherResult.Source,
                    IsAvailable = true,
                    RetrievedAt = DateTime.UtcNow
                };

                _context.WeatherData.Add(weather);
                await _context.SaveChangesAsync();
            }
        }

        if (weather == null)
        {
            weather = new WeatherData
            {
                TripId = tripId,
                Location = trip.Destination,
                TemperatureC = 22.0m,
                WindSpeedKph = 10.0m,
                WeatherCode = 1,
                Source = "Default Baseline",
                IsAvailable = true,
                RetrievedAt = DateTime.UtcNow
            };
        }

        var (riskScore, riskLevel, summary) = _riskAdvisoryService.CalculateTripRisk(weather);

        var assessment = new RiskAssessment
        {
            TripId = tripId,
            RiskScore = riskScore,
            RiskLevel = riskLevel,
            Summary = summary,
            AssessedAt = DateTime.UtcNow
        };

        _context.RiskAssessments.Add(assessment);
        await _context.SaveChangesAsync();

        var result = new RiskAssessmentDto
        {
            TripId = tripId,
            RiskScore = riskScore,
            RiskLevel = riskLevel,
            Summary = summary,
            TemperatureC = weather.TemperatureC,
            WindSpeedKph = weather.WindSpeedKph,
            WeatherCode = weather.WeatherCode
        };

        return Ok(result);
    }
}