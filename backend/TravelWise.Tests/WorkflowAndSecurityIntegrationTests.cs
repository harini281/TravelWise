using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using TravelWise.API.Services;
using Xunit;

namespace TravelWise.Tests;

public class WorkflowAndSecurityIntegrationTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    [Fact]
    public async Task ProcessApproval_WithApproveDecision_SetsStatusToCompletedAndApproved()
    {
        var db = CreateInMemoryDbContext(nameof(ProcessApproval_WithApproveDecision_SetsStatusToCompletedAndApproved));
        var client = new HttpClient();
        var aiClient = new AIServiceClient(client, db, NullLogger<AIServiceClient>.Instance);
        var controller = new WorkflowController(db, aiClient);

        var workflow = new AIWorkflow
        {
            TripId = 2,
            Status = "AWAITING_ADMIN_REVIEW",
            ApprovalStatus = "PENDING",
            ValidationPassed = true,
            TravellerDecision = "ACCEPTED",
            TravellerDecisionAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Reviewer = "reviewer@travelwise.lk",
            Comment = "Safety requirements validated and budget confirmed."
        };

        var result = await controller.ProcessApproval(workflow.Id, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var updatedWorkflow = Assert.IsType<AIWorkflow>(okResult.Value);

        Assert.Equal("COMPLETED", updatedWorkflow.Status);
        Assert.Equal("APPROVED", updatedWorkflow.ApprovalStatus);
        Assert.Equal("reviewer@travelwise.lk", updatedWorkflow.Reviewer);

        // Verify audit trail logged
        var audit = await db.WorkflowAuditLogs.FirstOrDefaultAsync(a => a.AIWorkflowId == workflow.Id && a.EventType == "WORKFLOW_APPROVE");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task ProcessApproval_BeforeTravellerAcceptance_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(ProcessApproval_BeforeTravellerAcceptance_ReturnsBadRequest));
        var client = new HttpClient();
        var aiClient = new AIServiceClient(client, db, NullLogger<AIServiceClient>.Instance);
        var controller = new WorkflowController(db, aiClient);

        var workflow = new AIWorkflow
        {
            TripId = 2,
            Status = "AWAITING_TRAVELLER_REVIEW",
            ApprovalStatus = "PENDING",
            ValidationPassed = true,
            TravellerDecision = null, // Not accepted!
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Reviewer = "admin@travelwise.lk",
            Comment = "Trying to approve prior to traveller acceptance"
        };

        var result = await controller.ProcessApproval(workflow.Id, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Admin cannot verify or approve this workflow before traveller acceptance", badRequest.Value!.ToString()!);
    }

    [Fact]
    public async Task SubmitTravellerDecision_Accept_SetsStatusToAwaitingAdminReview()
    {
        var db = CreateInMemoryDbContext(nameof(SubmitTravellerDecision_Accept_SetsStatusToAwaitingAdminReview));
        var client = new HttpClient();
        var aiClient = new AIServiceClient(client, db, NullLogger<AIServiceClient>.Instance);
        var controller = new WorkflowController(db, aiClient);

        var trip = new Trip
        {
            Id = 15,
            UserId = 1,
            Destination = "Galle",
            StartingPlace = "Colombo",
            StartDate = DateTime.UtcNow.AddDays(5),
            ReturnDate = DateTime.UtcNow.AddDays(8),
            BudgetAmount = 50000m,
            TravellerCount = 2,
            TripType = "Coastal"
        };
        db.Trips.Add(trip);

        var workflow = new AIWorkflow
        {
            Id = 20,
            TripId = 15,
            Status = "AWAITING_TRAVELLER_REVIEW",
            ApprovalStatus = "PENDING",
            ValidationPassed = true
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        // Simulate authenticated user matching trip.UserId = 1
        var userClaims = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(new[]
        {
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Email, "traveller@travelwise.lk"),
            new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Traveller")
        }, "mock"));
        controller.ControllerContext = new ControllerContext { HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext { User = userClaims } };

        var request = new TravellerWorkflowDecisionRequest
        {
            Decision = "ACCEPT",
            Comment = "I like this itinerary! Ready for administrative verification."
        };

        var result = await controller.SubmitTravellerDecision(workflow.Id, request);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var updated = await db.AIWorkflows.FindAsync(workflow.Id);
        Assert.NotNull(updated);
        Assert.Equal("ACCEPTED", updated.TravellerDecision);
        Assert.Equal("AWAITING_ADMIN_REVIEW", updated.Status);
        Assert.NotNull(updated.TravellerDecisionAt);
        Assert.Equal("I like this itinerary! Ready for administrative verification.", updated.TravellerComment);

        var audit = await db.WorkflowAuditLogs.FirstOrDefaultAsync(a => a.AIWorkflowId == workflow.Id && a.EventType == "TRAVELLER_ACCEPTED");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task ProcessApproval_WhenWorkflowNotAwaitingApproval_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(ProcessApproval_WhenWorkflowNotAwaitingApproval_ReturnsBadRequest));
        var client = new HttpClient();
        var aiClient = new AIServiceClient(client, db, NullLogger<AIServiceClient>.Instance);
        var controller = new WorkflowController(db, aiClient);

        var workflow = new AIWorkflow
        {
            TripId = 2,
            Status = "PLANNING",
            ApprovalStatus = "PENDING",
            ValidationPassed = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Reviewer = "reviewer@travelwise.lk"
        };

        var result = await controller.ProcessApproval(workflow.Id, request);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ProcessApproval_WithInvalidDecision_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(ProcessApproval_WithInvalidDecision_ReturnsBadRequest));
        var client = new HttpClient();
        var aiClient = new AIServiceClient(client, db, NullLogger<AIServiceClient>.Instance);
        var controller = new WorkflowController(db, aiClient);

        var workflow = new AIWorkflow
        {
            TripId = 2,
            Status = "AWAITING_APPROVAL",
            ApprovalStatus = "PENDING",
            ValidationPassed = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "UNAUTHORIZED_ACTION",
            Reviewer = "reviewer@travelwise.lk"
        };

        var result = await controller.ProcessApproval(workflow.Id, request);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AIServiceClient_WhenPythonServiceOffline_EngagesSafeFailure()
    {
        var db = CreateInMemoryDbContext(nameof(AIServiceClient_WhenPythonServiceOffline_EngagesSafeFailure));

        db.Trips.Add(new Trip
        {
            Id = 2,
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow.AddDays(10),
            ReturnDate = DateTime.UtcNow.AddDays(14),
            BudgetAmount = 80000,
            TravellerCount = 2,
            TripType = "Adventure",
            Status = "PLANNING"
        });
        await db.SaveChangesAsync();

        // HttpClient pointing to unreachable port
        var httpClient = new HttpClient { BaseAddress = new Uri("http://127.0.0.1:59999"), Timeout = TimeSpan.FromMilliseconds(500) };
        var aiClient = new AIServiceClient(httpClient, db, NullLogger<AIServiceClient>.Instance);

        var response = await aiClient.RunTripWorkflowAsync(2, 10);

        Assert.NotNull(response);
        Assert.Equal("SAFE_FAILURE", response.WorkflowStatus);
        Assert.Equal("PENDING", response.ApprovalStatus);
        Assert.NotEmpty(response.Errors);
        Assert.Contains("EXTERNAL_SERVICE_UNAVAILABLE", response.Errors[0]);
    }

    [Fact]
    public async Task WeatherService_WhenGeocodingFails_ReturnsFallbackBaseline()
    {
        // HttpClient with handler returning 500
        var failingHandler = new FailingHttpMessageHandler();
        var httpClient = new HttpClient(failingHandler);
        var weatherService = new WeatherService(httpClient);

        var result = await weatherService.GetCurrentWeatherAsync("Ella");

        Assert.NotNull(result);
        Assert.Equal("Ella", result.Location);
        Assert.Equal("Open-Meteo (Offline Fallback)", result.Source);
        Assert.True(result.TemperatureC > 0);
    }

    private class FailingHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError));
        }
    }
}
