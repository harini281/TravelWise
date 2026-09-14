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
    // GET LOCATION WEATHER ADVISORY & DETERMINISTIC SAFETY RULES
    // =========================================================

    public class WeatherAdvisoryDto
    {
        public string Location { get; set; } = string.Empty;
        public decimal TemperatureC { get; set; }
        public decimal WindSpeedKph { get; set; }
        public int WeatherCode { get; set; }
        public string WeatherCondition { get; set; } = string.Empty;
        public string Source { get; set; } = "Open-Meteo";
        public List<string> PackingChecklist { get; set; } = new();
        public List<string> SafetyRules { get; set; } = new();
        public string RiskLevel { get; set; } = "LOW";
        public bool HighRiskCaution { get; set; } = false;
    }

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

            var packing = new List<string>();
            var safety = new List<string>();
            bool highRisk = false;

            bool isSunny = weather.WeatherCode <= 2 && weather.TemperatureC >= 20;
            bool isRain = weather.WeatherCode >= 51;
            bool isCold = weather.TemperatureC < 18;
            bool isHikingOrAdventure = (tripType != null && (tripType.Contains("Adventure", StringComparison.OrdinalIgnoreCase) || tripType.Contains("Hiking", StringComparison.OrdinalIgnoreCase))) ||
                                       (interests != null && (interests.Contains("Hiking", StringComparison.OrdinalIgnoreCase) || interests.Contains("Nature", StringComparison.OrdinalIgnoreCase)));

            string condition;
            if (weather.WeatherCode >= 95) condition = "Thunderstorm";
            else if (weather.WeatherCode >= 80) condition = "Rain Showers";
            else if (weather.WeatherCode >= 51) condition = "Drizzle / Rain";
            else if (weather.WeatherCode >= 45) condition = "Foggy / Mist";
            else if (weather.WeatherCode >= 3) condition = "Overcast";
            else if (weather.WeatherCode >= 1) condition = "Partly Cloudy";
            else condition = "Sunny & Clear";

            // Deterministic Packing & Safety Rules
            // Sunny: sunscreen, hat, water
            if (isSunny || weather.TemperatureC >= 25)
            {
                packing.Add("Broad-spectrum sunscreen (SPF 50+)");
                packing.Add("Wide-brim hat or UV cap");
                packing.Add("Refillable water bottle (minimum 1.5L daily hydration)");
                packing.Add("UV-blocking sunglasses");
                safety.Add("Hydrate regularly and minimize direct midday sun exposure between 11:00 AM and 2:00 PM.");
            }

            // Rain: umbrella, raincoat, waterproof bag
            if (isRain)
            {
                packing.Add("Compact sturdy umbrella");
                packing.Add("Lightweight breathable raincoat / waterproof poncho");
                packing.Add("Waterproof dry bag or pack cover for electronics and documents");
                packing.Add("Quick-drying activewear");
                safety.Add("Watch for slippery paths and reduced road visibility during downpours.");
            }

            // Cold: jacket
            if (isCold)
            {
                packing.Add("Insulated warm fleece or thermal travel jacket");
                packing.Add("Layered long-sleeve clothing");
                packing.Add("Warm thermal socks");
                safety.Add("Temperature drops significantly after dusk in elevated areas. Dress in warm layers.");
            }

            // Hiking + Rain: waterproof footwear, high-risk caution
            if (isHikingOrAdventure && isRain)
            {
                highRisk = true;
                packing.Add("High-traction waterproof hiking boots");
                packing.Add("Trekking poles with anti-slip mud baskets");
                packing.Add("Personal blister kit and first-aid dressings");
                safety.Add("HIGH-RISK CAUTION: Avoid steep rock ascents, waterfall plunge pools, and slippery cliff trails during rain.");
                safety.Add("Flash-flood caution: Do not cross swollen mountain streams or ravines.");
            }
            else if (isHikingOrAdventure)
            {
                packing.Add("Sturdy trail shoes with grip");
                packing.Add("Trail first-aid kit");
                safety.Add("Stay on marked trails and inform your lodging of your trail itinerary.");
            }

            int score = 0;
            if (weather.TemperatureC >= 35 || weather.TemperatureC <= 10) score += 20;
            if (weather.WindSpeedKph >= 40) score += 35;
            else if (weather.WindSpeedKph >= 25) score += 20;
            if (weather.WeatherCode >= 95) score += 40;
            else if (weather.WeatherCode >= 80) score += 25;
            else if (weather.WeatherCode >= 51) score += 15;
            if (highRisk) score = Math.Max(score, 65);

            string riskLevel = score switch
            {
                < 25 => "LOW",
                < 50 => "MODERATE",
                < 75 => "HIGH",
                _ => "CRITICAL"
            };

            return Ok(new WeatherAdvisoryDto
            {
                Location = weather.Location,
                TemperatureC = weather.TemperatureC,
                WindSpeedKph = weather.WindSpeedKph,
                WeatherCode = weather.WeatherCode,
                WeatherCondition = condition,
                Source = weather.Source,
                PackingChecklist = packing,
                SafetyRules = safety,
                RiskLevel = riskLevel,
                HighRiskCaution = highRisk
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
    // GET WEATHER FOR TRIP
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
        var trip =
            await _context.Trips
                .FirstOrDefaultAsync(t => t.Id == tripId);

        if (trip == null)
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
            var weatherResult =
                await _weatherService.GetCurrentWeatherAsync(trip.Destination);

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