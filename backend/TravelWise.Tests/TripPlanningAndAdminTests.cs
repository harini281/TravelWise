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
}
