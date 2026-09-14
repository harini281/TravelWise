namespace TravelWise.API.Models;

public class User
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = "Traveller"; // "Traveller", "Reviewer", "Admin"

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Profile details
    public string? FullName { get; set; }

    // Password reset fields
    public string? PasswordResetToken { get; set; }

    public DateTime? PasswordResetExpiry { get; set; }

    // Onboarding status and preferences
    public bool HasCompletedOnboarding { get; set; } = false;

    public string? TravelStyle { get; set; }

    public string? Interests { get; set; }

    public string? BudgetStyle { get; set; }

    public string? ActivityPace { get; set; }

    public string? TransportPreference { get; set; }

    // Account status
    public bool IsActive { get; set; } = true;
}

