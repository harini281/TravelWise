using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using Xunit;

namespace TravelWise.Tests;

public class BudgetAndReviewerTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    private BudgetsController CreateBudgetsController(TravelWiseDbContext context)
    {
        return new BudgetsController(context, new BudgetCalculationService(context));
    }

    [Fact]
    public async Task GetTripBudgetSummary_ZeroBudget_ReturnsHealthUnset()
    {
        using var context = CreateInMemoryDbContext("BudgetZeroDb");
        var controller = CreateBudgetsController(context);

        var trip = new Trip
        {
            Id = 10,
            StartingPlace = "Colombo",
            Destination = "Kandy",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 0m,
            TravellerCount = 2,
            TripType = "Cultural"
        };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        var result = await controller.GetTripBudgetSummary(10);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var summary = Assert.IsType<TripBudgetSummaryDto>(okResult.Value);

        Assert.Equal("UNSET", summary.BudgetHealth);
        Assert.Equal(0m, summary.TotalBudget);
        Assert.Equal(0m, summary.SafeToSpend);
    }

    [Fact]
    public async Task GetTripBudgetSummary_CalculatesSafeToSpend_Correctly()
    {
        using var context = CreateInMemoryDbContext("BudgetSafeSpendDb");
        var controller = CreateBudgetsController(context);

        var trip = new Trip
        {
            Id = 20,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 100000m,
            ReturnBudgetReserve = 15000m,
            FoodBudget = 20000m,
            AccommodationBudget = 30000m,
            TravellerCount = 2,
            TripType = "Adventure"
        };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        // Add an initial expense
        var expController = new ExpensesController(context);
        var expDto = new CreateExpenseDto
        {
            TripId = 20,
            BudgetCategoryId = 1, // Transport
            Amount = 10000m,
            Description = "Train ticket",
            ExpenseDate = DateTime.UtcNow,
            PaymentMethod = "CASH"
        };
        await expController.CreateExpense(expDto);

        var result = await controller.GetTripBudgetSummary(20);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var summary = Assert.IsType<TripBudgetSummaryDto>(okResult.Value);

        Assert.Equal(100000m, summary.TotalBudget);
        Assert.Equal(10000m, summary.TotalSpent);
        Assert.Equal(90000m, summary.RemainingFunds);
        Assert.Equal(15000m, summary.ReturnReserve);
        Assert.Equal(20000m, summary.FoodBudget);
        // Safe To Spend = 100000 - 10000 - 15000 - 20000 = 55000
        Assert.Equal(55000m, summary.SafeToSpend);
        Assert.Equal("HEALTHY", summary.BudgetHealth);
    }

    [Fact]
    public async Task UpdateFoodPlan_UpdatesTripAndCategoryAllocations()
    {
        using var context = CreateInMemoryDbContext("BudgetFoodPlanDb");
        var controller = CreateBudgetsController(context);

        var trip = new Trip
        {
            Id = 30,
            StartingPlace = "Colombo",
            Destination = "Galle",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(2),
            BudgetAmount = 50000m,
            FoodBudget = 5000m,
            TravellerCount = 1,
            TripType = "Relaxation"
        };
        context.Trips.Add(trip);
        await context.SaveChangesAsync();

        var updateDto = new UpdateFoodPlanDto
        {
            FoodBudget = 12000m,
            BudgetStyle = "Comfort"
        };

        var result = await controller.UpdateFoodPlan(30, updateDto);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var summary = Assert.IsType<TripBudgetSummaryDto>(okResult.Value);

        Assert.Equal(12000m, summary.FoodBudget);
        var updatedTrip = await context.Trips.FindAsync(30);
        Assert.Equal(12000m, updatedTrip!.FoodBudget);
    }

    [Fact]
    public async Task ProcessWorkflowApproval_RejectWithoutComment_ReturnsBadRequest()
    {
        using var context = CreateInMemoryDbContext("WorkflowRejectDb");
        var controller = new WorkflowController(context, null!);

        var trip = new Trip
        {
            Id = 40,
            StartingPlace = "Colombo",
            Destination = "Jaffna",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(4),
            BudgetAmount = 60000m,
            TravellerCount = 2,
            TripType = "Culture"
        };
        context.Trips.Add(trip);

        var workflow = new AIWorkflow
        {
            Id = 1,
            TripId = 40,
            Status = "AWAITING_APPROVAL",
            ApprovalStatus = "PENDING"
        };
        context.AIWorkflows.Add(workflow);
        await context.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "REJECT",
            Comment = "" // Missing comment on reject!
        };

        var result = await controller.ProcessApproval(1, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("reason/comment is required", badRequest.Value!.ToString()!);
    }

    [Fact]
    public async Task ProcessWorkflowApproval_RequestChangesWithoutComment_ReturnsBadRequest()
    {
        using var context = CreateInMemoryDbContext("WorkflowChangesDb");
        var controller = new WorkflowController(context, null!);

        var trip = new Trip
        {
            Id = 50,
            StartingPlace = "Colombo",
            Destination = "Sigiriya",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(2),
            BudgetAmount = 40000m,
            TravellerCount = 1,
            TripType = "Heritage"
        };
        context.Trips.Add(trip);

        var workflow = new AIWorkflow
        {
            Id = 2,
            TripId = 50,
            Status = "AWAITING_APPROVAL",
            ApprovalStatus = "PENDING"
        };
        context.AIWorkflows.Add(workflow);
        await context.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "REQUEST_CHANGES",
            Comment = "   " // Blank comment!
        };

        var result = await controller.ProcessApproval(2, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("comment is required", badRequest.Value!.ToString()!);
    }

    [Fact]
    public async Task ProcessWorkflowApproval_ApproveWithoutComment_Succeeds()
    {
        using var context = CreateInMemoryDbContext("WorkflowApproveDb");
        var controller = new WorkflowController(context, null!);

        var trip = new Trip
        {
            Id = 60,
            StartingPlace = "Colombo",
            Destination = "Nuwara Eliya",
            StartDate = DateTime.UtcNow,
            ReturnDate = DateTime.UtcNow.AddDays(3),
            BudgetAmount = 75000m,
            TravellerCount = 2,
            TripType = "Nature"
        };
        context.Trips.Add(trip);

        var workflow = new AIWorkflow
        {
            Id = 3,
            TripId = 60,
            Status = "AWAITING_APPROVAL",
            ApprovalStatus = "PENDING"
        };
        context.AIWorkflows.Add(workflow);
        await context.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Reviewer = "lead.reviewer@travelwise.lk",
            Comment = null // Optional for approve
        };

        var result = await controller.ProcessApproval(3, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var updatedWf = Assert.IsType<AIWorkflow>(okResult.Value);

        Assert.Equal("APPROVED", updatedWf.ApprovalStatus);
        Assert.Equal("COMPLETED", updatedWf.Status);
    }
}
