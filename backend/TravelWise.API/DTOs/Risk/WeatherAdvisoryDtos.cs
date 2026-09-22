namespace TravelWise.API.DTOs;

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
