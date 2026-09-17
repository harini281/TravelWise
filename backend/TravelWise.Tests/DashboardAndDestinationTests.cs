using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.Models;

namespace TravelWise.Tests;

public class DashboardAndDestinationTests
{
    private static TravelWiseDbContext Database() => new(new DbContextOptionsBuilder<TravelWiseDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static DashboardController Dashboard(TravelWiseDbContext db, int userId) => new(db)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "test"))
        } }
    };
    private static JsonElement Body(IActionResult result) => JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(result).Value,
        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

    [Fact]
    public async Task DashboardRejectsAnotherTravellersTrip()
    {
        using var db = Database();
        db.Trips.Add(new Trip { Id = 41, UserId = 7 }); await db.SaveChangesAsync();
        Assert.IsType<ForbidResult>(await Dashboard(db, 9).GetTrip(41, default));
    }

    [Fact]
    public async Task MissingAssessmentsStayMissingAndReadingCreatesNoRecords()
    {
        using var db = Database();
        db.Trips.Add(new Trip { Id = 41, UserId = 7 }); await db.SaveChangesAsync();
        var data = Body(await Dashboard(db, 7).GetTrip(41, default));
        Assert.Equal("UNSET", data.GetProperty("budget").GetProperty("health").GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("weather").ValueKind);
        Assert.Equal(JsonValueKind.Null, data.GetProperty("risk").ValueKind);
        Assert.Equal(JsonValueKind.Null, data.GetProperty("workflow").ValueKind);
        Assert.Equal(0, data.GetProperty("readiness").GetProperty("total").GetInt32());
        Assert.Empty(db.Budgets); Assert.Empty(db.WeatherData); Assert.Empty(db.AIWorkflows);
    }

    [Fact]
    public async Task SummaryUsesActualExpensesAndDistinctRequiredChecklistItems()
    {
        using var db = Database();
        db.Trips.Add(new Trip { Id = 41, UserId = 7, BudgetAmount = 10000m, FoodBudget = 2000m, ReturnBudgetReserve = 3000m });
        db.Budgets.Add(new Budget { Id = 51, TripId = 41 });
        db.BudgetCategories.Add(new BudgetCategory { Id = 61, BudgetId = 51, Name = "Food" });
        db.Expenses.Add(new Expense { TripId = 41, BudgetCategoryId = 61, Amount = 500m });
        db.TravelRequirements.AddRange(new TravelRequirement { Id = 71, TripId = 41, IsRequired = true }, new TravelRequirement { Id = 72, TripId = 41, IsRequired = false });
        db.ReadinessItems.AddRange(new ReadinessItem { TripId = 41, TravelRequirementId = 71, Status = "COMPLETED" }, new ReadinessItem { TripId = 41, TravelRequirementId = 71, Status = "COMPLETED" }, new ReadinessItem { TripId = 41, TravelRequirementId = 72, Status = "COMPLETED" });
        await db.SaveChangesAsync();
        var data = Body(await Dashboard(db, 7).GetTrip(41, default));
        Assert.Equal(500m, data.GetProperty("budget").GetProperty("spent").GetDecimal());
        Assert.Equal(1500m, data.GetProperty("budget").GetProperty("remainingFood").GetDecimal());
        Assert.Equal(5000m, data.GetProperty("budget").GetProperty("safeToSpend").GetDecimal());
        Assert.Equal(1, data.GetProperty("readiness").GetProperty("total").GetInt32());
        Assert.Equal(1, data.GetProperty("readiness").GetProperty("completed").GetInt32());
    }

    private sealed class StubHandler(HttpStatusCode status, string content) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(content) });
        }
    }
    private sealed class ClientFactory(HttpClient client) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => client;
    }
    private static DestinationsController Destinations(StubHandler handler) => new(new ClientFactory(new HttpClient(handler)),
        new ConfigurationBuilder().Build(), new MemoryCache(new MemoryCacheOptions()));

    [Fact]
    public async Task UnconfiguredPhotographyReturnsNoImageWithoutCallingProvider()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "{}");
        var data = Body(await Destinations(handler).GetPhoto("Paris", default));
        Assert.Equal(JsonValueKind.Null, data.GetProperty("photo").ValueKind);
        Assert.Equal(0, handler.Calls);
    }
    [Fact]
    public async Task DestinationProviderFailureIsNotAnEmptySuccessfulSearch()
    {
        var result = await Destinations(new StubHandler(HttpStatusCode.ServiceUnavailable, "{}")).Search("Paris", default);
        Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode);
    }
    [Fact]
    public async Task DestinationSearchUsesProviderCoordinatesAndCachesResults()
    {
        var handler = new StubHandler(HttpStatusCode.OK, "{\"results\":[{\"id\":12,\"name\":\"Paris\",\"country\":\"France\",\"latitude\":48.85,\"longitude\":2.35}]}");
        var controller = Destinations(handler);
        var data = Body(await controller.Search("Paris", default));
        Assert.Equal(48.85, data.GetProperty("destinations")[0].GetProperty("latitude").GetDouble());
        await controller.Search("Paris", default);
        Assert.Equal(1, handler.Calls);
        Assert.IsType<BadRequestObjectResult>(await controller.Search("P", default));
    }
}
