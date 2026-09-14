using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.Models;
using Xunit;

namespace TravelWise.Tests;

public class TripCompletionTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    private TripsController CreateControllerWithUser(TravelWiseDbContext db, int userId)
    {
        var controller = new TripsController(db);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, $"user_{userId}"),
            new Claim(ClaimTypes.Role, "Traveller")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };
        return controller;
    }

    [Fact]
    public async Task ManualCompletion_ByOwner_SetsCompletedAndPersistsMethod()
    {
        var db = CreateInMemoryDbContext(nameof(ManualCompletion_ByOwner_SetsCompletedAndPersistsMethod));
        var controller = CreateControllerWithUser(db, 10);

        var trip = new Trip
        {
            Id = 1,
            UserId = 10,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow.AddDays(-3),
            ReturnDate = DateTime.UtcNow,
            BudgetAmount = 60000,
            TravellerCount = 2,
            Status = "ACTIVE"
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        var dto = new TripsController.CompleteTripDto
        {
            CompletionMethod = "MANUAL"
        };

        var result = await controller.CompleteTrip(1, dto);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var savedTrip = await db.Trips.FindAsync(1);
        Assert.NotNull(savedTrip);
        Assert.Equal("COMPLETED", savedTrip.Status);
        Assert.Equal("MANUAL", savedTrip.CompletionMethod);
        Assert.NotNull(savedTrip.CompletedAt);
    }

    [Fact]
    public async Task LocationArrival_Within500Meters_CompletesTripSuccessfully()
    {
        var db = CreateInMemoryDbContext(nameof(LocationArrival_Within500Meters_CompletesTripSuccessfully));
        var controller = CreateControllerWithUser(db, 15);

        // Ella destination coordinates: 6.8667, 81.0466
        var trip = new Trip
        {
            Id = 2,
            UserId = 15,
            StartingPlace = "Colombo",
            Destination = "Ella",
            DestinationLatitude = 6.8667,
            DestinationLongitude = 81.0466,
            StartDate = DateTime.UtcNow.AddDays(-2),
            ReturnDate = DateTime.UtcNow,
            BudgetAmount = 50000,
            TravellerCount = 1,
            Status = "ACTIVE"
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        // 200 metres from Ella (approx 0.0018 degrees lat diff)
        var dto = new TripsController.CompleteTripDto
        {
            CompletionMethod = "LOCATION",
            CurrentLatitude = 6.8680,
            CurrentLongitude = 81.0466
        };

        var result = await controller.CompleteTrip(2, dto);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var savedTrip = await db.Trips.FindAsync(2);
        Assert.NotNull(savedTrip);
        Assert.Equal("COMPLETED", savedTrip.Status);
        Assert.Equal("LOCATION", savedTrip.CompletionMethod);
        Assert.NotNull(savedTrip.CompletedAt);
    }

    [Fact]
    public async Task LocationArrival_Beyond500Meters_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(LocationArrival_Beyond500Meters_ReturnsBadRequest));
        var controller = CreateControllerWithUser(db, 20);

        var trip = new Trip
        {
            Id = 3,
            UserId = 20,
            StartingPlace = "Colombo",
            Destination = "Ella",
            DestinationLatitude = 6.8667,
            DestinationLongitude = 81.0466,
            StartDate = DateTime.UtcNow.AddDays(-2),
            ReturnDate = DateTime.UtcNow,
            BudgetAmount = 50000,
            TravellerCount = 1,
            Status = "ACTIVE"
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        // Still in Colombo (approx 200 km away!)
        var dto = new TripsController.CompleteTripDto
        {
            CompletionMethod = "LOCATION",
            CurrentLatitude = 6.9271,
            CurrentLongitude = 79.8612
        };

        var result = await controller.CompleteTrip(3, dto);
        Assert.IsType<BadRequestObjectResult>(result);

        var savedTrip = await db.Trips.FindAsync(3);
        Assert.NotNull(savedTrip);
        Assert.Equal("ACTIVE", savedTrip.Status); // Still active!
        Assert.Null(savedTrip.CompletedAt);
    }

    [Fact]
    public async Task CompleteTrip_WhenAlreadyCompleted_PreventsDuplicateOverwrite()
    {
        var db = CreateInMemoryDbContext(nameof(CompleteTrip_WhenAlreadyCompleted_PreventsDuplicateOverwrite));
        var controller = CreateControllerWithUser(db, 25);

        var initialCompletedAt = DateTime.UtcNow.AddHours(-5);
        var trip = new Trip
        {
            Id = 4,
            UserId = 25,
            StartingPlace = "Colombo",
            Destination = "Kandy",
            Status = "COMPLETED",
            CompletionMethod = "MANUAL",
            CompletedAt = initialCompletedAt
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        var dto = new TripsController.CompleteTripDto { CompletionMethod = "LOCATION" };
        var result = await controller.CompleteTrip(4, dto);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var savedTrip = await db.Trips.FindAsync(4);
        Assert.NotNull(savedTrip);
        Assert.Equal(initialCompletedAt, savedTrip.CompletedAt); // Preserved!
        Assert.Equal("MANUAL", savedTrip.CompletionMethod); // Preserved!
    }

    [Fact]
    public async Task CompleteTrip_ByNonOwner_ReturnsForbidden()
    {
        var db = CreateInMemoryDbContext(nameof(CompleteTrip_ByNonOwner_ReturnsForbidden));
        // Authenticated as User 99
        var controller = CreateControllerWithUser(db, 99);

        // Trip belongs to User 42
        var trip = new Trip
        {
            Id = 5,
            UserId = 42,
            StartingPlace = "Galle",
            Destination = "Mirissa",
            Status = "ACTIVE"
        };
        db.Trips.Add(trip);
        await db.SaveChangesAsync();

        var dto = new TripsController.CompleteTripDto { CompletionMethod = "MANUAL" };
        var result = await controller.CompleteTrip(5, dto);
        Assert.IsType<ForbidResult>(result);
    }
}
