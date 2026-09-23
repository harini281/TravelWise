using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using TravelWise.API.Data;
using TravelWise.API.Models;
using TravelWise.API.Services;
using TravelWise.API.Services.Auth;
using Xunit;

namespace TravelWise.Tests;

public class AdminProvisioningTests
{
    private TravelWiseDbContext CreateInMemoryDbContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new TravelWiseDbContext(options);
    }

    private AuthService CreateAuthService()
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

    [Fact]
    public async Task ProvisionInitialAdminAsync_WhenCredentialsMissing_ReturnsFalseAndCreatesNoUser()
    {
        using var db = CreateInMemoryDbContext(nameof(ProvisionInitialAdminAsync_WhenCredentialsMissing_ReturnsFalseAndCreatesNoUser));
        var authService = CreateAuthService();

        var config = new ConfigurationBuilder().Build(); // No admin config
        var logger = NullLogger<AdminProvisioningService>.Instance;

        // Ensure env vars are cleared for this test
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_EMAIL", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_PASSWORD", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_NAME", null);

        var service = new AdminProvisioningService(db, authService, config, logger);
        var result = await service.ProvisionInitialAdminAsync();

        Assert.False(result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task ProvisionInitialAdminAsync_WhenPasswordTooShort_ReturnsFalseAndCreatesNoUser()
    {
        using var db = CreateInMemoryDbContext(nameof(ProvisionInitialAdminAsync_WhenPasswordTooShort_ReturnsFalseAndCreatesNoUser));
        var authService = CreateAuthService();

        var inMemory = new Dictionary<string, string?>
        {
            { "TRAVELWISE_ADMIN_EMAIL", "shortpass_admin@travelwise.lk" },
            { "TRAVELWISE_ADMIN_PASSWORD", "123" } // < 6 chars
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
        var logger = NullLogger<AdminProvisioningService>.Instance;

        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_EMAIL", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_PASSWORD", null);

        var service = new AdminProvisioningService(db, authService, config, logger);
        var result = await service.ProvisionInitialAdminAsync();

        Assert.False(result);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task ProvisionInitialAdminAsync_WhenConfigured_ProvisionsAdminWithExactSamePBKDF2Hash()
    {
        using var db = CreateInMemoryDbContext(nameof(ProvisionInitialAdminAsync_WhenConfigured_ProvisionsAdminWithExactSamePBKDF2Hash));
        var authService = CreateAuthService();

        var rawPassword = "SecureSuperAdminPass2026!";
        var inMemory = new Dictionary<string, string?>
        {
            { "TRAVELWISE_ADMIN_EMAIL", "lead_admin@travelwise.lk" },
            { "TRAVELWISE_ADMIN_PASSWORD", rawPassword },
            { "TRAVELWISE_ADMIN_NAME", "System Governance Admin" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
        var logger = NullLogger<AdminProvisioningService>.Instance;

        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_EMAIL", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_PASSWORD", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_NAME", null);

        var service = new AdminProvisioningService(db, authService, config, logger);
        var result = await service.ProvisionInitialAdminAsync();

        Assert.True(result);

        var provisioned = await db.Users.FirstOrDefaultAsync(u => u.Email == "lead_admin@travelwise.lk");
        Assert.NotNull(provisioned);
        Assert.Equal("Admin", provisioned.Role);
        Assert.Equal("System Governance Admin", provisioned.FullName);
        Assert.True(provisioned.HasCompletedOnboarding);
        Assert.True(provisioned.IsActive);

        // Verify password hash is verified with standard AuthService VerifyPassword
        var isPasswordValid = authService.VerifyPassword(rawPassword, provisioned.PasswordHash);
        Assert.True(isPasswordValid);

        // Verify wrong password fails
        Assert.False(authService.VerifyPassword("WrongPassword123!", provisioned.PasswordHash));
    }

    [Fact]
    public async Task ProvisionInitialAdminAsync_WhenAdminAlreadyExists_NeverOverwritesExistingPassword()
    {
        using var db = CreateInMemoryDbContext(nameof(ProvisionInitialAdminAsync_WhenAdminAlreadyExists_NeverOverwritesExistingPassword));
        var authService = CreateAuthService();

        var initialPassword = "InitialPassword123!";
        var originalUser = new User
        {
            Username = "existingadmin",
            Email = "existing_admin@travelwise.lk",
            FullName = "Original Admin",
            PasswordHash = authService.HashPassword(initialPassword),
            Role = "Admin",
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };
        db.Users.Add(originalUser);
        await db.SaveChangesAsync();

        var originalHash = originalUser.PasswordHash;

        // Try provisioning with a DIFFERENT password
        var inMemory = new Dictionary<string, string?>
        {
            { "TRAVELWISE_ADMIN_EMAIL", "existing_admin@travelwise.lk" },
            { "TRAVELWISE_ADMIN_PASSWORD", "BrandNewPassword999!" },
            { "TRAVELWISE_ADMIN_NAME", "Overwriting Admin Attempt" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
        var logger = NullLogger<AdminProvisioningService>.Instance;

        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_EMAIL", null);
        Environment.SetEnvironmentVariable("TRAVELWISE_ADMIN_PASSWORD", null);

        var service = new AdminProvisioningService(db, authService, config, logger);
        var result = await service.ProvisionInitialAdminAsync();

        // Must return false and NOT overwrite
        Assert.False(result);

        var userAfter = await db.Users.FirstOrDefaultAsync(u => u.Email == "existing_admin@travelwise.lk");
        Assert.NotNull(userAfter);
        Assert.Equal(originalHash, userAfter.PasswordHash); // Hash untouched!
        Assert.Equal("Original Admin", userAfter.FullName); // Name untouched!
        Assert.True(authService.VerifyPassword(initialPassword, userAfter.PasswordHash));
        Assert.False(authService.VerifyPassword("BrandNewPassword999!", userAfter.PasswordHash));
    }

    [Fact]
    public async Task CleanupVerificationTestUsers_IfPresentInDatabase()
    {
        var connectionString = "Host=localhost;Port=5432;Database=travelwise;Username=postgres;Password=sasi12";
        try
        {
            var options = new DbContextOptionsBuilder<TravelWiseDbContext>()
                .UseNpgsql(connectionString)
                .Options;

            using var db = new TravelWiseDbContext(options);
            var testUsers = await db.Users
                .Where(u => u.Email == "admin_verify@travelwise.lk" || u.Email.StartsWith("traveller_check_"))
                .ToListAsync();

            if (testUsers.Any())
            {
                db.Users.RemoveRange(testUsers);
                await db.SaveChangesAsync();
            }
        }
        catch
        {
            // Non-blocking if database is offline during build
        }
    }
}
