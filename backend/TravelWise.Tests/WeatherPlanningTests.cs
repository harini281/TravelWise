using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.Services;
using Xunit;

namespace TravelWise.Tests;

public class WeatherPlanningTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    private RiskController CreateRiskController(TravelWiseDbContext db)
    {
        var httpClient = new HttpClient();
        var weatherService = new WeatherService(httpClient);
        return new RiskController(db, weatherService);
    }

    [Fact]
    public async Task GetWeatherForecast_WhenDatesFarInFuture_ReturnsSeasonalContextWithoutInventedForecast()
    {
        var db = CreateInMemoryDbContext(nameof(GetWeatherForecast_WhenDatesFarInFuture_ReturnsSeasonalContextWithoutInventedForecast));
        var controller = CreateRiskController(db);

        // Future date far outside 16-day forecast range (e.g., 60 days ahead)
        var futureStart = DateTime.UtcNow.AddDays(60);
        var futureReturn = futureStart.AddDays(4);

        var result = await controller.GetWeatherForecastAndPlanning(
            location: "Ella",
            startDate: futureStart,
            returnDate: futureReturn,
            tripType: "Adventure & Hiking",
            interests: "Hiking, Nature"
        );

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var planning = Assert.IsType<RiskController.WeatherDatePlanningDto>(okResult.Value);

        Assert.False(planning.IsForecastAvailable);
        Assert.True(planning.IsSeasonalGeneralInfo);
        Assert.Contains("not available yet", planning.ForecastMessage, StringComparison.OrdinalIgnoreCase);
        Assert.NotNull(planning.SeasonalLabel);
        Assert.Contains("Seasonal Climate Context", planning.SeasonalLabel);
        Assert.NotEmpty(planning.PackingRecommendations);
        Assert.NotEmpty(planning.SafeActivityCategories);
    }

    [Fact]
    public async Task GetWeatherForecast_WhenWithinForecastWindow_EvaluatesWeatherAndReturnsPacking()
    {
        var db = CreateInMemoryDbContext(nameof(GetWeatherForecast_WhenWithinForecastWindow_EvaluatesWeatherAndReturnsPacking));
        var controller = CreateRiskController(db);

        // Within next 3 days
        var start = DateTime.UtcNow.Date.AddDays(1);
        var ret = start.AddDays(2);

        var result = await controller.GetWeatherForecastAndPlanning(
            location: "Kandy",
            startDate: start,
            returnDate: ret,
            tripType: "Culture & Relaxation",
            interests: "Temples, Tea"
        );

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var planning = Assert.IsType<RiskController.WeatherDatePlanningDto>(okResult.Value);

        Assert.True(planning.IsForecastAvailable);
        Assert.NotNull(planning.PlannedWeatherSummary);
        Assert.NotEmpty(planning.PackingRecommendations);
        Assert.NotEmpty(planning.SafeActivityCategories);
    }

    [Fact]
    public async Task GetWeatherForecast_EmptyLocation_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(GetWeatherForecast_EmptyLocation_ReturnsBadRequest));
        var controller = CreateRiskController(db);

        var result = await controller.GetWeatherForecastAndPlanning(
            location: "   ",
            startDate: DateTime.UtcNow,
            returnDate: DateTime.UtcNow.AddDays(2)
        );

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
