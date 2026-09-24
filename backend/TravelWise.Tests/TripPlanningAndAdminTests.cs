using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TravelWise.API.Controllers;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using TravelWise.API.Services;
using Xunit;

namespace TravelWise.Tests;

public class TripPlanningAndAdminTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    private AuthService GetAuthService()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Jwt:Key", "TravelWiseSuperSecretSecureKeyForUniversityVivaDemo2026!"},
            {"Jwt:Issuer", "TravelWiseAPI"},
            {"Jwt:Audience", "TravelWiseClient"}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        return new AuthService(configuration);
    }

    private AuthController CreateAuthController(TravelWiseDbContext db)
    {
        var authService = GetAuthService();
        var emailService = new EmailService(
            new ConfigurationBuilder().Build(),
            NullLogger<EmailService>.Instance
        );
        var logger = NullLogger<AuthController>.Instance;

        return new AuthController(db, authService, emailService, logger);
    }

    [Fact]
    public async Task Login_WhenAccountIsDeactivated_ReturnsForbidden()
    {
        var db = CreateInMemoryDbContext(nameof(Login_WhenAccountIsDeactivated_ReturnsForbidden));
        var authService = GetAuthService();
        var controller = CreateAuthController(db);

        var user = new User
        {
            Username = "deactivated_user",
            Email = "deactivated@travelwise.lk",
            PasswordHash = authService.HashPassword("SecurePassword123!"),
            Role = "Traveller",
            IsActive = false // Deactivated account
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            Username = "deactivated_user",
            Password = "SecurePassword123!"
        };

        var result = await controller.Login(loginDto);
        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusCodeResult.StatusCode);
    }

    [Fact]
    public async Task Admin_ToggleUserStatus_DeactivatesAndActivatesUser()
    {
        var db = CreateInMemoryDbContext(nameof(Admin_ToggleUserStatus_DeactivatesAndActivatesUser));
        var controller = new AdminController(db);

        var adminUser = new User
        {
            Id = 1,
            Username = "admin_master",
            Email = "admin@travelwise.lk",
            Role = "Admin",
            IsActive = true
        };

        var targetUser = new User
        {
            Id = 2,
            Username = "nimal_traveller",
            Email = "nimal@travelwise.lk",
            Role = "Traveller",
            IsActive = true
        };

        db.Users.AddRange(adminUser, targetUser);
        await db.SaveChangesAsync();

        // Setup Admin HttpContext
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "admin_master"),
            new Claim(ClaimTypes.Role, "Admin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        // Deactivate user 2
        var deactivateResult = await controller.UpdateUserStatus(2, new AdminController.UserStatusDto { IsActive = false });
        var okDeactivate = Assert.IsType<OkObjectResult>(deactivateResult);

        var updatedUser = await db.Users.FindAsync(2);
        Assert.NotNull(updatedUser);
        Assert.False(updatedUser.IsActive);

        // Reactivate user 2
        var reactivateResult = await controller.UpdateUserStatus(2, new AdminController.UserStatusDto { IsActive = true });
        Assert.IsType<OkObjectResult>(reactivateResult);

        var reactivatedUser = await db.Users.FindAsync(2);
        Assert.NotNull(reactivatedUser);
        Assert.True(reactivatedUser.IsActive);
    }

    [Fact]
    public async Task Admin_PreventSelfDeactivation_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(Admin_PreventSelfDeactivation_ReturnsBadRequest));
        var controller = new AdminController(db);

        var adminUser = new User
        {
            Id = 1,
            Username = "admin_master",
            Email = "admin@travelwise.lk",
            Role = "Admin",
            IsActive = true
        };
        db.Users.Add(adminUser);
        await db.SaveChangesAsync();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim(ClaimTypes.Name, "admin_master"),
            new Claim(ClaimTypes.Role, "Admin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var result = await controller.UpdateUserStatus(1, new AdminController.UserStatusDto { IsActive = false });
        Assert.IsType<BadRequestObjectResult>(result);

        var user = await db.Users.FindAsync(1);
        Assert.NotNull(user);
        Assert.True(user.IsActive); // Still active!
    }

    [Fact]
    public async Task TripsController_AuthenticatedTraveller_OnlySeesOwnTrips()
    {
        var db = CreateInMemoryDbContext(nameof(TripsController_AuthenticatedTraveller_OnlySeesOwnTrips));
        var controller = new TripsController(db);

        // Seed trips for user 10 and user 20
        db.Trips.AddRange(
            new Trip
            {
                Id = 101,
                UserId = 10,
                StartingPlace = "Colombo",
                Destination = "Kandy",
                StartDate = DateTime.UtcNow.AddDays(1),
                ReturnDate = DateTime.UtcNow.AddDays(3),
                BudgetAmount = 45000,
                TravellerCount = 2,
                TripType = "Culture",
                Status = "PLANNING"
            },
            new Trip
            {
                Id = 102,
                UserId = 20, // Belongs to different user!
                StartingPlace = "Galle",
                Destination = "Mirissa",
                StartDate = DateTime.UtcNow.AddDays(5),
                ReturnDate = DateTime.UtcNow.AddDays(7),
                BudgetAmount = 60000,
                TravellerCount = 3,
                TripType = "Relaxation",
                Status = "PLANNING"
            }
        );
        await db.SaveChangesAsync();

        // Authenticate as User 10 (Traveller)
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "10"),
            new Claim(ClaimTypes.Name, "traveller10"),
            new Claim(ClaimTypes.Role, "Traveller")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var result = await controller.GetTrips();
        var trips = Assert.IsAssignableFrom<IEnumerable<Trip>>(result.Value);
        var tripList = trips.ToList();

        Assert.Single(tripList);
        Assert.Equal(101, tripList[0].Id);
        Assert.Equal("Kandy", tripList[0].Destination);
    }

    [Fact]
    public async Task TripsController_CreateTrip_AutoAssignsAuthenticatedUserId()
    {
        var db = CreateInMemoryDbContext(nameof(TripsController_CreateTrip_AutoAssignsAuthenticatedUserId));
        var controller = new TripsController(db);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim(ClaimTypes.Name, "traveller42"),
            new Claim(ClaimTypes.Role, "Traveller")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var newTrip = new Trip
        {
            StartingPlace = "Colombo",
            Destination = "Ella",
            StartDate = DateTime.UtcNow.AddDays(2),
            ReturnDate = DateTime.UtcNow.AddDays(6),
            BudgetAmount = 75000,
            TravellerCount = 2,
            TripType = "Adventure",
            SelectedTransport = "Train",
            EstimatedDistanceKm = 210.5,
            EstimatedDurationMinutes = 360,
            EstimatedTransportCost = 4200
        };

        var actionResult = await controller.CreateTrip(newTrip);
        var createdAtAction = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        var createdTrip = Assert.IsType<Trip>(createdAtAction.Value);

        Assert.Equal(42, createdTrip.UserId);
        Assert.Equal("Train", createdTrip.SelectedTransport);
        Assert.Equal(210.5, createdTrip.EstimatedDistanceKm);
        Assert.Equal(4200, createdTrip.EstimatedTransportCost);
    }

    [Fact]
    public async Task AdminController_GetUsers_DoesNotExposeSecrets()
    {
        var db = CreateInMemoryDbContext(nameof(AdminController_GetUsers_DoesNotExposeSecrets));
        var controller = new AdminController(db);

        db.Users.AddRange(
            new User
            {
                Id = 1,
                Username = "traveller1",
                Email = "traveller1@travelwise.lk",
                PasswordHash = "SECRET_HASH_DO_NOT_EXPOSE",
                PasswordResetToken = "SECRET_TOKEN_DO_NOT_EXPOSE",
                Role = "Traveller",
                TravelStyle = "Cultural & Heritage",
                Interests = "Ancient Ruins, Temples",
                BudgetStyle = "Balanced",
                ActivityPace = "Moderate",
                TransportPreference = "Scenic Train",
                HasCompletedOnboarding = true,
                IsActive = true
            },
            new User
            {
                Id = 2,
                Username = "adminuser",
                Email = "admin@travelwise.lk",
                PasswordHash = "ADMIN_SECRET_HASH",
                Role = "Admin",
                IsActive = true
            }
        );
        await db.SaveChangesAsync();

        var result = await controller.GetUsers();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var users = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);

        // Serialize and verify no secret strings are present
        var json = System.Text.Json.JsonSerializer.Serialize(users);
        Assert.DoesNotContain("SECRET_HASH", json);
        Assert.DoesNotContain("SECRET_TOKEN", json);
        Assert.DoesNotContain("ADMIN_SECRET_HASH", json);
        Assert.Contains("traveller1@travelwise.lk", json);
        Assert.Contains("Ancient Ruins", json);
        Assert.Contains("Scenic Train", json);
    }

    [Fact]
    public async Task AdminController_GetSystemStats_ReturnsTruthfulMetricsAndLists()
    {
        var db = CreateInMemoryDbContext(nameof(AdminController_GetSystemStats_ReturnsTruthfulMetricsAndLists));
        var controller = new AdminController(db);

        db.Users.Add(new User { Id = 1, Username = "trav1", Email = "trav1@example.com", Role = "Traveller", IsActive = true });
        db.Users.Add(new User { Id = 2, Username = "admin1", Email = "admin@example.com", Role = "Admin", IsActive = true });

        db.Trips.Add(new Trip { Id = 1, UserId = 1, Destination = "Kandy", Status = "ACTIVE", StartDate = DateTime.UtcNow.AddDays(1), ReturnDate = DateTime.UtcNow.AddDays(3), BudgetAmount = 50000 });
        db.Trips.Add(new Trip { Id = 2, UserId = 1, Destination = "Jaffna", Status = "COMPLETED", StartDate = DateTime.UtcNow.AddDays(-10), ReturnDate = DateTime.UtcNow.AddDays(-5), BudgetAmount = 40000 });

        db.AIWorkflows.Add(new AIWorkflow
        {
            Id = 1,
            TripId = 1,
            Status = "AWAITING_ADMIN_REVIEW",
            ApprovalStatus = "PENDING",
            TravellerDecision = "ACCEPTED",
            TravellerDecisionAt = DateTime.UtcNow
        });

        db.RiskAssessments.Add(new RiskAssessment
        {
            Id = 1,
            TripId = 1,
            RiskLevel = "HIGH",
            RiskScore = 78,
            Summary = "Monsoon storm warning"
        });

        await db.SaveChangesAsync();

        var result = await controller.GetSystemStats();
        var okResult = Assert.IsType<OkObjectResult>(result);

        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.Contains("\"activeTrips\":1", json);
        Assert.Contains("\"completedTrips\":1", json);
        Assert.Contains("\"pendingApprovals\":1", json);
        Assert.Contains("\"highRiskAlerts\":1", json);
        Assert.Contains("Monsoon storm warning", json);
        Assert.Contains("Kandy", json);
    }

    [Fact]
    public async Task AdminController_ProcessWorkflowReview_BeforeTravellerAcceptance_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(AdminController_ProcessWorkflowReview_BeforeTravellerAcceptance_ReturnsBadRequest));
        var controller = new AdminController(db);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "99"),
            new Claim(ClaimTypes.Email, "admin@travelwise.lk"),
            new Claim(ClaimTypes.Role, "Admin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var workflow = new AIWorkflow
        {
            Id = 5,
            TripId = 1,
            Status = "AWAITING_TRAVELLER_REVIEW",
            ApprovalStatus = "PENDING",
            TravellerDecision = null // Not accepted by traveller
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Comment = "Admin approving before traveller acceptance"
        };

        var result = await controller.ProcessWorkflowReview(5, request);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Admin cannot verify or approve this workflow before traveller acceptance", badRequest.Value!.ToString()!);
    }

    [Fact]
    public async Task AdminController_ProcessWorkflowReview_AfterTravellerAcceptance_Succeeds()
    {
        var db = CreateInMemoryDbContext(nameof(AdminController_ProcessWorkflowReview_AfterTravellerAcceptance_Succeeds));
        var controller = new AdminController(db);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "99"),
            new Claim(ClaimTypes.Email, "admin@travelwise.lk"),
            new Claim(ClaimTypes.Role, "Admin")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth")) }
        };

        var workflow = new AIWorkflow
        {
            Id = 6,
            TripId = 1,
            Status = "AWAITING_ADMIN_REVIEW",
            ApprovalStatus = "PENDING",
            TravellerDecision = "ACCEPTED",
            TravellerComment = "Looks great, please verify.",
            TravellerDecisionAt = DateTime.UtcNow
        };
        db.AIWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        var request = new WorkflowApprovalRequest
        {
            Decision = "APPROVE",
            Comment = "All risk thresholds and budgets verified."
        };

        var result = await controller.ProcessWorkflowReview(6, request);
        var okResult = Assert.IsType<OkObjectResult>(result);

        var updated = await db.AIWorkflows.FindAsync(6);
        Assert.NotNull(updated);
        Assert.Equal("APPROVED", updated.ApprovalStatus);
        Assert.Equal("COMPLETED", updated.Status);
        Assert.Equal("All risk thresholds and budgets verified.", updated.ApprovalComment);
        Assert.Contains("admin@travelwise.lk (Admin)", updated.Reviewer);

        var audit = await db.WorkflowAuditLogs.FirstOrDefaultAsync(a => a.AIWorkflowId == 6 && a.EventType == "ADMIN_APPROVE");
        Assert.NotNull(audit);
    }

    [Fact]
    public async Task AdminController_GetSafetyAlerts_ReturnsRiskDistributionAndAlerts()
    {
        var db = CreateInMemoryDbContext(nameof(AdminController_GetSafetyAlerts_ReturnsRiskDistributionAndAlerts));
        var controller = new AdminController(db);

        db.Trips.Add(new Trip { Id = 1, Destination = "Trincomalee", StartingPlace = "Colombo" });
        db.RiskAssessments.Add(new RiskAssessment
        {
            Id = 1,
            TripId = 1,
            RiskLevel = "HIGH",
            RiskScore = 85,
            Summary = "High coastal waves advisory",
            AssessedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var result = await controller.GetSafetyAlerts();
        var okResult = Assert.IsType<OkObjectResult>(result);

        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.Contains("\"highRiskCount\":1", json);
        Assert.Contains("High coastal waves advisory", json);
    }
}
