using Microsoft.Extensions.Configuration;
using TravelWise.API.Models;
using TravelWise.API.Services;
using Xunit;

namespace TravelWise.Tests;

public class AuthServiceTests
{
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

    [Fact]
    public void HashPassword_And_VerifyPassword_ValidPassword_ReturnsTrue()
    {
        var authService = GetAuthService();
        var rawPassword = "SecurePassword123!";

        var hash = authService.HashPassword(rawPassword);

        Assert.NotNull(hash);
        Assert.Contains(":", hash);

        var isVerified = authService.VerifyPassword(rawPassword, hash);
        Assert.True(isVerified);
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var authService = GetAuthService();
        var rawPassword = "CorrectPassword123!";
        var wrongPassword = "WrongPassword999!";

        var hash = authService.HashPassword(rawPassword);

        var isVerified = authService.VerifyPassword(wrongPassword, hash);
        Assert.False(isVerified);
    }

    [Fact]
    public void GenerateJwtToken_ProducesValidToken()
    {
        var authService = GetAuthService();
        var user = new User
        {
            Id = 42,
            Username = "student",
            Email = "student@travelwise.lk",
            Role = "Reviewer"
        };

        var token = authService.GenerateJwtToken(user, out var expiresAt);

        Assert.False(string.IsNullOrWhiteSpace(token));
        Assert.True(expiresAt > DateTime.UtcNow);
        Assert.Equal(3, token.Split('.').Length); // JWT header.payload.signature
    }
}
