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

public class AuthenticationAndOnboardingTests
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

    private AuthController CreateController(TravelWiseDbContext db)
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
    public async Task Register_AssignsTravellerRole_AndSetsHasCompletedOnboardingFalse()
    {
        var db = CreateInMemoryDbContext(nameof(Register_AssignsTravellerRole_AndSetsHasCompletedOnboardingFalse));
        var controller = CreateController(db);

        var dto = new RegisterDto
        {
            FullName = "Amara Silva",
            Username = "amara",
            Email = "amara@travelwise.lk",
            Password = "Password123!",
            ConfirmPassword = "Password123!",
            Role = "Admin" // Attempting to self-assign Admin
        };

        var result = await controller.Register(dto);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AuthResponseDto>(okResult.Value);

        Assert.Equal("Traveller", response.Role); // Forced to Traveller!
        Assert.False(response.HasCompletedOnboarding);
        Assert.Equal("Amara Silva", response.FullName);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));

        var savedUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "amara");
        Assert.NotNull(savedUser);
        Assert.Equal("Traveller", savedUser.Role);
        Assert.False(savedUser.HasCompletedOnboarding);
    }

    [Fact]
    public async Task Register_WithPasswordMismatch_ReturnsBadRequest()
    {
        var db = CreateInMemoryDbContext(nameof(Register_WithPasswordMismatch_ReturnsBadRequest));
        var controller = CreateController(db);

        var dto = new RegisterDto
        {
            Username = "mismatchUser",
            Email = "mismatch@travelwise.lk",
            Password = "Password123!",
            ConfirmPassword = "DifferentPassword999!"
        };

        var result = await controller.Register(dto);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task ForgotPassword_GeneratesSecureSingleUseToken_AndResetPasswordWorks()
    {
        var db = CreateInMemoryDbContext(nameof(ForgotPassword_GeneratesSecureSingleUseToken_AndResetPasswordWorks));
        var authService = GetAuthService();
        var controller = CreateController(db);

        // Seed initial user
        var user = new User
        {
            Username = "traveler_reset",
            Email = "reset@travelwise.lk",
            PasswordHash = authService.HashPassword("OldPassword123!"),
            Role = "Traveller"
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Step 1: Request password reset
        var forgotResult = await controller.ForgotPassword(new ForgotPasswordDto { Email = "reset@travelwise.lk" });
        Assert.IsType<OkObjectResult>(forgotResult);

        var updatedUser = await db.Users.FirstOrDefaultAsync(u => u.Email == "reset@travelwise.lk");
        Assert.NotNull(updatedUser);
        Assert.NotNull(updatedUser.PasswordResetToken);
        Assert.True(updatedUser.PasswordResetExpiry > DateTime.UtcNow);

        var token = updatedUser.PasswordResetToken;

        // Step 2: Reset password using valid token
        var resetDto = new ResetPasswordDto
        {
            Email = "reset@travelwise.lk",
            Token = token,
            NewPassword = "NewStrongPassword456!",
            ConfirmPassword = "NewStrongPassword456!"
        };

        var resetResult = await controller.ResetPassword(resetDto);
        Assert.IsType<OkObjectResult>(resetResult);

        // Step 3: Verify old password fails, new password succeeds, and token was invalidated
        var userAfterReset = await db.Users.FirstOrDefaultAsync(u => u.Email == "reset@travelwise.lk");
        Assert.NotNull(userAfterReset);
        Assert.Null(userAfterReset.PasswordResetToken); // Token invalidated!
        Assert.Null(userAfterReset.PasswordResetExpiry);

        Assert.False(authService.VerifyPassword("OldPassword123!", userAfterReset.PasswordHash));
        Assert.True(authService.VerifyPassword("NewStrongPassword456!", userAfterReset.PasswordHash));

        // Step 4: Verify same token cannot be reused
        var secondResetResult = await controller.ResetPassword(resetDto);
        Assert.IsType<BadRequestObjectResult>(secondResetResult);
    }

    [Fact]
    public async Task UpdatePreferences_PersistsPreferences_AndSetsHasCompletedOnboardingTrue()
    {
        var db = CreateInMemoryDbContext(nameof(UpdatePreferences_PersistsPreferences_AndSetsHasCompletedOnboardingTrue));
        var authService = GetAuthService();
        var controller = CreateController(db);

        var user = new User
        {
            Username = "onboarding_user",
            Email = "onboarding@travelwise.lk",
            FullName = "Kasun Perera",
            PasswordHash = authService.HashPassword("Pass123!"),
            Role = "Traveller",
            HasCompletedOnboarding = false
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Simulate Authenticated User Claims
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, "Traveller")
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        var preferencesDto = new UpdatePreferencesDto
        {
            TravelStyle = "Adventure",
            Interests = new List<string> { "Nature", "Hiking", "Photography" },
            BudgetStyle = "Balanced",
            ActivityPace = "Balanced",
            TransportPreference = "Train"
        };

        var result = await controller.UpdatePreferences(preferencesDto);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var profile = Assert.IsType<UserProfileDto>(okResult.Value);

        Assert.True(profile.HasCompletedOnboarding);
        Assert.Equal("Adventure", profile.TravelStyle);
        Assert.Equal(3, profile.Interests?.Count);
        Assert.Contains("Hiking", profile.Interests!);
        Assert.Equal("Balanced", profile.BudgetStyle);
        Assert.Equal("Train", profile.TransportPreference);

        var dbUser = await db.Users.FirstOrDefaultAsync(u => u.Username == "onboarding_user");
        Assert.NotNull(dbUser);
        Assert.True(dbUser.HasCompletedOnboarding);
        Assert.Equal("Nature,Hiking,Photography", dbUser.Interests);
    }
}
