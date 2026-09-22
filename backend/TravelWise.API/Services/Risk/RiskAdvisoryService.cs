using TravelWise.API.DTO;
using TravelWise.API.DTOs;
using TravelWise.API.Integrations.OpenMeteo;
using TravelWise.API.Models;

namespace TravelWise.API.Services.Risk;

public class RiskAdvisoryService : IRiskAdvisoryService
{
    public WeatherAdvisoryDto EvaluateWeatherAdvisory(
        WeatherResultDto weather,
        string? tripType,
        string? interests)
    {
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
        if (isSunny || weather.TemperatureC >= 25)
        {
            packing.Add("Broad-spectrum sunscreen (SPF 50+)");
            packing.Add("Wide-brim hat or UV cap");
            packing.Add("Refillable water bottle (minimum 1.5L daily hydration)");
            packing.Add("UV-blocking sunglasses");
            safety.Add("Hydrate regularly and minimize direct midday sun exposure between 11:00 AM and 2:00 PM.");
        }

        if (isRain)
        {
            packing.Add("Compact sturdy umbrella");
            packing.Add("Lightweight breathable raincoat / waterproof poncho");
            packing.Add("Waterproof dry bag or pack cover for electronics and documents");
            packing.Add("Quick-drying activewear");
            safety.Add("Watch for slippery paths and reduced road visibility during downpours.");
        }

        if (isCold)
        {
            packing.Add("Insulated warm fleece or thermal travel jacket");
            packing.Add("Layered long-sleeve clothing");
            packing.Add("Warm thermal socks");
            safety.Add("Temperature drops significantly after dusk in elevated areas. Dress in warm layers.");
        }

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

        return new WeatherAdvisoryDto
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
        };
    }

    public WeatherDatePlanningDto EvaluateForecastPlanning(
        string resolvedLoc,
        List<WeatherService.DailyForecastRecord> forecast,
        DateTime sDate,
        DateTime rDate,
        string? tripType,
        string? interests)
    {
        var result = new WeatherDatePlanningDto
        {
            Location = resolvedLoc,
            PlannedStartDate = sDate.ToString("yyyy-MM-dd"),
            PlannedReturnDate = rDate.ToString("yyyy-MM-dd")
        };

        int durationDays = (rDate.Date - sDate.Date).Days;
        string startStr = sDate.ToString("yyyy-MM-dd");
        string returnStr = rDate.ToString("yyyy-MM-dd");

        bool isInForecastRange = forecast.Count > 0 &&
                                 string.Compare(startStr, forecast.First().Date) >= 0 &&
                                 string.Compare(startStr, forecast.Last().Date) <= 0;

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
            return result;
        }

        // Within Forecast Range
        result.IsForecastAvailable = true;
        result.ForecastMessage = "Live forecast evaluated successfully.";

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

            var suggestions = new List<AlternativeDateOptionDto>();
            int windowSize = durationDays + 1;

            for (int i = 0; i <= forecast.Count - windowSize; i++)
            {
                var candidateWindow = forecast.Skip(i).Take(windowSize).ToList();
                var candStart = candidateWindow.First();
                var candReturn = candidateWindow.Last();

                if (candStart.Date == startStr) continue;

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

        return result;
    }

    public (int RiskScore, string RiskLevel, string Summary) CalculateTripRisk(WeatherData weather)
    {
        int riskScore = 0;

        if (weather.TemperatureC >= 35 || weather.TemperatureC <= 10)
        {
            riskScore += 20;
        }

        if (weather.WindSpeedKph >= 40)
        {
            riskScore += 35;
        }
        else if (weather.WindSpeedKph >= 25)
        {
            riskScore += 20;
        }

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

        riskScore = Math.Min(riskScore, 100);

        string riskLevel = riskScore switch
        {
            < 25 => "LOW",
            < 50 => "MODERATE",
            < 75 => "HIGH",
            _ => "CRITICAL"
        };

        string summary = riskLevel switch
        {
            "LOW" => "Current weather conditions indicate a low travel risk.",
            "MODERATE" => "Some weather conditions may affect the trip. Travellers should remain cautious.",
            "HIGH" => "Weather conditions may significantly affect planned activities. Safer alternatives should be considered.",
            "CRITICAL" => "Current conditions indicate serious travel risk. High-risk activities should not proceed without review.",
            _ => "Risk status could not be determined."
        };

        return (riskScore, riskLevel, summary);
    }
}
