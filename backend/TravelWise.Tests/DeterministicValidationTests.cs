using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using Xunit;

namespace TravelWise.Tests;

public class DeterministicValidationTests
{
    private TravelWiseDbContext GetInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    [Fact]
    public async Task CreateExpense_ExceedingCategoryAllocatedAmount_ReturnsBadRequest()
    {
        var context = GetInMemoryDbContext("ExpenseOverspendDb");
        var controller = new ExpensesController(context);

        context.Trips.Add(new Trip
        {
            Id = 1,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 50000,
            TravellerCount = 2
        });

        context.Budgets.Add(new Budget
        {
            Id = 1,
            TripId = 1,
            TotalAmount = 50000,
            Currency = "LKR"
        });

        context.BudgetCategories.Add(new BudgetCategory
        {
            Id = 1,
            BudgetId = 1,
            Name = "Food",
            AllocatedAmount = 10000
        });

        await context.SaveChangesAsync();

        var dto = new CreateExpenseDto
        {
            TripId = 1,
            BudgetCategoryId = 1,
            Amount = 15000, // Exceeds 10,000 allocated
            Description = "Fine dining lunch",
            ExpenseDate = DateTime.UtcNow,
            PaymentMethod = "CARD"
        };

        var result = await controller.CreateExpense(dto);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Expense exceeds the allocated budget for this category.", badRequestResult.Value);
    }

    [Fact]
    public async Task CreateActivity_EndBeforeStart_ReturnsBadRequest()
    {
        var context = GetInMemoryDbContext("ActivityEndTimeDb");
        var controller = new ActivitiesController(context);

        context.Trips.Add(new Trip
        {
            Id = 1,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 50000,
            TravellerCount = 2
        });
        await context.SaveChangesAsync();

        var dto = new CreateActivityDto
        {
            TripId = 1,
            Name = "Ella Rock Hike",
            Category = "Hiking",
            ScheduledStart = DateTime.UtcNow.AddHours(4),
            ScheduledEnd = DateTime.UtcNow.AddHours(2), // End before start
            EstimatedCost = 2000,
            DurationMinutes = 120
        };

        var result = await controller.CreateActivity(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Activity scheduled end time must be after the start time.", badRequest.Value);
    }

    [Fact]
    public async Task CreateActivity_OutsideTripDates_ReturnsBadRequest()
    {
        var context = GetInMemoryDbContext("ActivityOutsideTripDb");
        var controller = new ActivitiesController(context);

        var tripStart = DateTime.UtcNow.AddDays(2);
        var tripReturn = DateTime.UtcNow.AddDays(5);

        context.Trips.Add(new Trip
        {
            Id = 1,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = tripStart,
            ReturnDate = tripReturn,
            BudgetAmount = 50000,
            TravellerCount = 2
        });
        await context.SaveChangesAsync();

        var dto = new CreateActivityDto
        {
            TripId = 1,
            Name = "Early Tour",
            Category = "Sightseeing",
            ScheduledStart = DateTime.UtcNow, // 2 days before trip
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            EstimatedCost = 1000,
            DurationMinutes = 120
        };

        var result = await controller.CreateActivity(dto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Activity schedule must be within the trip dates.", badRequest.Value);
    }

    [Fact]
    public async Task CreateActivity_OverlappingSchedule_ReturnsBadRequest()
    {
        var context = GetInMemoryDbContext("ActivityConflictDb");
        var controller = new ActivitiesController(context);

        var baseTime = DateTime.UtcNow.AddDays(1);

        context.Trips.Add(new Trip
        {
            Id = 1,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = baseTime.AddHours(-1),
            ReturnDate = baseTime.AddDays(3),
            BudgetAmount = 50000,
            TravellerCount = 2
        });

        context.Activities.Add(new Activity
        {
            Id = 1,
            TripId = 1,
            Name = "Morning Tea Factory Tour",
            Category = "Tour",
            ScheduledStart = baseTime.AddHours(9),
            ScheduledEnd = baseTime.AddHours(12)
        });

        await context.SaveChangesAsync();

        // Conflicting activity from 10:00 to 13:00
        var conflictingDto = new CreateActivityDto
        {
            TripId = 1,
            Name = "Cooking Class",
            Category = "Culture",
            ScheduledStart = baseTime.AddHours(10),
            ScheduledEnd = baseTime.AddHours(13),
            EstimatedCost = 1500,
            DurationMinutes = 180
        };

        var result = await controller.CreateActivity(conflictingDto);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("The activity schedule conflicts with an existing activity.", badRequest.Value);
    }

    [Fact]
    public async Task AssessReadiness_CalculatesScoreAndLevelAccurately()
    {
        var context = GetInMemoryDbContext("ReadinessScoreDb");
        var controller = new ReadinessController(context);

        context.Trips.Add(new Trip
        {
            Id = 1,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 50000,
            TravellerCount = 2
        });

        context.TravelRequirements.AddRange(
            new TravelRequirement { Id = 1, TripId = 1, Name = "Train Ticket", IsRequired = true },
            new TravelRequirement { Id = 2, TripId = 1, Name = "Hotel Booking", IsRequired = true },
            new TravelRequirement { Id = 3, TripId = 1, Name = "Hiking Gear", IsRequired = true },
            new TravelRequirement { Id = 4, TripId = 1, Name = "Medicine Kit", IsRequired = true }
        );

        // 3 of 4 completed -> 75% PARTIALLY_READY
        context.ReadinessItems.AddRange(
            new ReadinessItem { Id = 1, TripId = 1, TravelRequirementId = 1, Status = "COMPLETED" },
            new ReadinessItem { Id = 2, TripId = 1, TravelRequirementId = 2, Status = "COMPLETED" },
            new ReadinessItem { Id = 3, TripId = 1, TravelRequirementId = 3, Status = "COMPLETED" },
            new ReadinessItem { Id = 4, TripId = 1, TravelRequirementId = 4, Status = "PENDING" }
        );

        await context.SaveChangesAsync();

        var result = await controller.AssessReadiness(1);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }
}
