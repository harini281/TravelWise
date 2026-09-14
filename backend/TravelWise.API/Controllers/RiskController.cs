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
    // WEATHER-AWARE DATE PLANNING & ALTERNATIVE DATE DISCOVERY
    // =========================================================

    public class WeatherDatePlanningDto
    {
        public string Location { get; set; } = string.Empty;
        public bool IsForecastAvailable { get; set; }
        public string ForecastMessage { get; set; } = string.Empty;
        public bool IsSeasonalGeneralInfo { get; set; }
        public string? SeasonalLabel { get; set; }
        public string? SeasonalSummary { get; set; }

        // Planned dates evaluation
        public string? PlannedStartDate { get; set; }
        public string? PlannedReturnDate { get; set; }
        public bool IsPlannedWeatherSuitable { get; set; } = true;
        public string PlannedWeatherSummary { get; set; } = string.Empty;
        public int PlannedWeatherRiskScore { get; set; }
        public string PlannedWeatherRiskLevel { get; set; } = "LOW";
        public List<string> UnsuitableReasons { get; set; } = new();

        // Up to 3 better alternative date options
        public List<AlternativeDateOptionDto> AlternativeDateSuggestions { get; set; } = new();

        // Deterministic packing checklist tailored to weather + trip type + activities
        public List<string> PackingRecommendations { get; set; } = new();

        // Activity guidance
        public List<string> SafeActivityCategories { get; set; } = new();
        public List<string> RestrictedActivityCategories { get; set; } = new();
        public List<string> ActivitySafetyAdvice { get; set; } = new();
    }

    public class AlternativeDateOptionDto
    {
        public string SuggestedStartDate { get; set; } = string.Empty;
        public string SuggestedReturnDate { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public decimal MaxTemperatureC { get; set; }
        public decimal MinTemperatureC { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string SuitabilityLevel { get; set; } = "Good";
        public int RiskScore { get; set; }
    }

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

        var result = new WeatherDatePlanningDto
        {
            Location = resolvedLoc
        };

        DateTime sDate = startDate ?? DateTime.UtcNow.Date;
        DateTime rDate = returnDate ?? sDate.AddDays(3);
        if (rDate < sDate) rDate = sDate;

        result.PlannedStartDate = sDate.ToString("yyyy-MM-dd");
        result.PlannedReturnDate = rDate.ToString("yyyy-MM-dd");

        int durationDays = (rDate.Date - sDate.Date).Days;

        // Check if planned start date falls within available daily forecast range
        string startStr = sDate.ToString("yyyy-MM-dd");
        string returnStr = rDate.ToString("yyyy-MM-dd");

        bool isInForecastRange = forecast.Count > 0 &&
                                 string.Compare(startStr, forecast.First().Date) >= 0 &&
                                 string.Compare(startStr, forecast.Last().Date) <= 0;

        // Deterministic Packing Checklist Base
        var packing = new List<string>();
        var safeActivities = new List<string>();
        var restrictedActivities = new List<string>();
        var activitySafety = new List<string>();

        bool isHikingOrAdventure = (tripType != null && (tripType.Contains("Adventure", StringComparison.OrdinalIgnoreCase) || tripType.Contains("Hiking", StringComparison.OrdinalIgnoreCase))) ||
                                   (interests != null && (interests.Contains("Hiking", StringComparison.OrdinalIgnoreCase) || interests.Contains("Nature", StringComparison.OrdinalIgnoreCase)));

        if (!isInForecastRange)
        {
            result.IsForecastAvailable = false;
            result.ForecastMessage = "Detailed weather forecast is not available yet.";
            result.IsSeasonalGeneralInfo = true;
            result.SeasonalLabel = "Seasonal Climate Context (Not a Live Forecast)";

            int month = sDate.Month;
            if (month is 12 or 1 or 2)
            {
                result.SeasonalSummary = "Northeast monsoon & dry season in central highlands. Generally sunny mornings with crisp cool evenings in hill country.";
                packing.Add("Warm fleece or travel jacket (cool nights)");
                packing.Add("Lightweight breathable daywear");
                packing.Add("Sunscreen & sunglasses");
            }
            else if (month is >= 5 and <= 9)
            {
                result.SeasonalSummary = "Southwest monsoon period. Expect frequent precipitation on western and southern slopes; dry and clear on eastern coast and cultural triangle.";
                packing.Add("Compact sturdy umbrella");
                packing.Add("Breathable lightweight raincoat");
                packing.Add("Waterproof footwear");
            }
            else
            {
                result.SeasonalSummary = "Inter-monsoonal transition season. Tropical warm daytime temperatures with potential late afternoon convective showers.";
                packing.Add("Compact umbrella");
                packing.Add("Quick-drying clothing");
                packing.Add("Sun protection (hat, sunscreen)");
            }

            if (isHikingOrAdventure)
            {
                packing.Add("High-grip trail footwear");
                packing.Add("Refillable water bottle");
                packing.Add("Basic trail first aid kit");
            }

            safeActivities.Add("Cultural Landmarks & Temples");
            safeActivities.Add("Scenic Tea Plantations");
            safeActivities.Add("Local Culinary Experiences");

            result.PackingRecommendations = packing;
            result.SafeActivityCategories = safeActivities;
            result.RestrictedActivityCategories = restrictedActivities;
            return Ok(result);
        }

        // Within Forecast Range
        result.IsForecastAvailable = true;
        result.ForecastMessage = "Live forecast evaluated successfully.";

        // Find days matching the trip
        var plannedDays = forecast
            .Where(f => string.Compare(f.Date, startStr) >= 0 && string.Compare(f.Date, returnStr) <= 0)
            .ToList();

        if (plannedDays.Count == 0)
        {
            plannedDays = forecast.Take(Math.Min(durationDays + 1, forecast.Count)).ToList();
        }

        bool hasThunderstorm = plannedDays.Any(d => d.WeatherCode >= 95);
        bool hasSevereRain = plannedDays.Any(d => d.WeatherCode >= 81 || d.PrecipitationSumMm >= 15.0m);
        bool hasDangerousWind = plannedDays.Any(d => d.MaxWindSpeedKph >= 35.0m);
        bool hasExtremeHeat = plannedDays.Any(d => d.MaxTemperatureC >= 36.0m);
        bool hasUnsuitableDay = plannedDays.Any(d => !d.IsSuitable);

        int maxRisk = plannedDays.Count > 0 ? plannedDays.Max(d => d.RiskScore) : 0;
        result.PlannedWeatherRiskScore = maxRisk;
        result.PlannedWeatherRiskLevel = maxRisk switch
        {
            < 25 => "LOW",
            < 50 => "MODERATE",
            < 75 => "HIGH",
            _ => "CRITICAL"
        };

        if (hasThunderstorm || hasSevereRain || hasDangerousWind || hasExtremeHeat || maxRisk >= 50)
        {
            result.IsPlannedWeatherSuitable = false;
            result.PlannedWeatherSummary = "⚠ Weather conditions may not be suitable for your planned dates.";

            if (hasThunderstorm) result.UnsuitableReasons.Add("Thunderstorms and active lightning forecast");
            if (hasSevereRain) result.UnsuitableReasons.Add("Heavy continuous rainfall with waterlogging danger");
            if (hasDangerousWind) result.UnsuitableReasons.Add("Dangerous wind gusts exceeding safe outdoor limits");
            if (hasExtremeHeat) result.UnsuitableReasons.Add("Extreme heat risk posing sunstroke hazard");

            // Search alternative dates within forecast
            var suggestions = new List<AlternativeDateOptionDto>();
            int windowSize = durationDays + 1;

            for (int i = 0; i <= forecast.Count - windowSize; i++)
            {
                var candidateWindow = forecast.Skip(i).Take(windowSize).ToList();
                var candStart = candidateWindow.First();
                var candReturn = candidateWindow.Last();

                // Exclude the exact planned start date
                if (candStart.Date == startStr) continue;

                // Evaluate candidate window
                bool candAllSuitable = candidateWindow.All(d => d.IsSuitable);
                int candMaxRisk = candidateWindow.Max(d => d.RiskScore);

                if (candAllSuitable && candMaxRisk < maxRisk)
                {
                    string suitLevel = candMaxRisk < 20 ? "Optimal" : "Good";
                    string reason = candMaxRisk < 20
                        ? "Optimal clear skies, mild temperature, and dry ground conditions"
                        : "Significantly better weather with low rain probability";

                    suggestions.Add(new AlternativeDateOptionDto
                    {
                        SuggestedStartDate = candStart.Date,
                        SuggestedReturnDate = candReturn.Date,
                        Condition = candStart.WeatherCondition,
                        MaxTemperatureC = candidateWindow.Max(d => d.MaxTemperatureC),
                        MinTemperatureC = candidateWindow.Min(d => d.MinTemperatureC),
                        Reason = reason,
                        SuitabilityLevel = suitLevel,
                        RiskScore = candMaxRisk
                    });

                    if (suggestions.Count >= 3) break;
                }
            }

            // Pass 2: If no fully dry window was found, find the windows with the lowest total precipitation & risk
            if (suggestions.Count == 0)
            {
                var candidateWindows = new List<(List<WeatherService.DailyForecastRecord> Window, decimal TotalPrecip, int MaxRisk)>();
                for (int i = 0; i <= forecast.Count - windowSize; i++)
                {
                    var window = forecast.Skip(i).Take(windowSize).ToList();
                    if (window.First().Date == startStr) continue;
                    var totalPrecip = window.Sum(d => d.PrecipitationSumMm);
                    var wRisk = window.Max(d => d.RiskScore);
                    candidateWindows.Add((window, totalPrecip, wRisk));
                }

                foreach (var (candWindow, totalPrecip, wRisk) in candidateWindows.OrderBy(w => w.TotalPrecip).ThenBy(w => w.MaxRisk).Take(3))
                {
                    var candStart = candWindow.First();
                    var candReturn = candWindow.Last();
                    suggestions.Add(new AlternativeDateOptionDto
                    {
                        SuggestedStartDate = candStart.Date,
                        SuggestedReturnDate = candReturn.Date,
                        Condition = candStart.WeatherCondition,
                        MaxTemperatureC = candWindow.Max(d => d.MaxTemperatureC),
                        MinTemperatureC = candWindow.Min(d => d.MinTemperatureC),
                        Reason = totalPrecip < 5.0m
                            ? "Significantly lower rainfall and milder winds than planned departure"
                            : "Lowest precipitation window across the current forecast period",
                        SuitabilityLevel = wRisk < 35 ? "Favorable" : "Moderate",
                        RiskScore = wRisk
                    });
                }
            }

            result.AlternativeDateSuggestions = suggestions;

            // Restrict dangerous outdoor activities
            restrictedActivities.Add("Steep Cliff & Ridge Ascents (Slip & Lightning Hazard)");
            restrictedActivities.Add("Waterfall Base Plunge Pools (Flash-flood Hazard)");
            restrictedActivities.Add("Open-top Water Sports");

            safeActivities.Add("Artisanal Tea Factory Tours & Tastings (Indoor Safe)");
            safeActivities.Add("Cultural Heritage Museums & Covered Temples");
            safeActivities.Add("Traditional Culinary & Cooking Masterclasses");

            activitySafety.Add("HIGH RISK: Postpone waterfall swimming and steep rock scrambles during heavy precipitation.");
        }
        else
        {
            result.IsPlannedWeatherSuitable = true;
            result.PlannedWeatherSummary = "✓ Good conditions for your planned trip.";

            safeActivities.Add("Scenic Viewpoints & Ridge Treks");
            safeActivities.Add("Nine Arches Rail Walk & Photography");
            safeActivities.Add("Outdoor Nature Trails & Birdwatching");
            safeActivities.Add("Cultural Heritage Sites");

            activitySafety.Add("Weather conditions are favorable. Follow standard trail hydration and sun safety guidelines.");
        }

        // Tailor packing recommendations based on weather condition + trip type
        bool anyRain = plannedDays.Any(d => d.WeatherCode >= 51);
        bool anyHot = plannedDays.Any(d => d.MaxTemperatureC >= 25.0m);
        bool anyCold = plannedDays.Any(d => d.MinTemperatureC <= 18.0m);

        if (anyRain)
        {
            packing.Add("Compact sturdy umbrella");
            packing.Add("Lightweight breathable raincoat");
            packing.Add("Waterproof footwear / trail shoes");
            packing.Add("Waterproof pack cover for electronics");
        }

        if (anyHot)
        {
            packing.Add("Broad-spectrum sunscreen (SPF 50+)");
            packing.Add("Wide-brim hat or UV cap");
            packing.Add("Reusable water bottle (minimum 1.5L daily hydration)");
            packing.Add("UV-blocking sunglasses");
        }

        if (anyCold)
        {
            packing.Add("Insulated fleece or travel jacket");
            packing.Add("Warm thermal layers");
        }

        if (isHikingOrAdventure)
        {
            packing.Add("Trekking poles with anti-slip mud baskets");
            packing.Add("High-traction waterproof hiking boots");
            packing.Add("Personal blister kit and basic first aid items");
        }

        result.PackingRecommendations = packing.Distinct().ToList();
        result.SafeActivityCategories = safeActivities;
        result.RestrictedActivityCategories = restrictedActivities;
        result.ActivitySafetyAdvice = activitySafety;

        return Ok(result);
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