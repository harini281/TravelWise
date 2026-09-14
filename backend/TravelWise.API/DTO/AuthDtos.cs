using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTOs;

public class RegisterDto
{
    public string? FullName { get; set; }

    [Required]
    [MinLength(3)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? ConfirmPassword { get; set; }

    public string Role { get; set; } = "Traveller";
}

public class LoginDto
{
    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class ForgotPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;

    public string? ConfirmPassword { get; set; }
}

public class UpdatePreferencesDto
{
    public string? TravelStyle { get; set; }
    public List<string>? Interests { get; set; }
    public string? BudgetStyle { get; set; }
    public string? ActivityPace { get; set; }
    public string? TransportPreference { get; set; }
}

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string? FullName { get; set; }
    public bool HasCompletedOnboarding { get; set; }
    public string? TravelStyle { get; set; }
    public List<string>? Interests { get; set; }
    public string? BudgetStyle { get; set; }
}

public class UserProfileDto
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? FullName { get; set; }
    public bool HasCompletedOnboarding { get; set; }
    public string? TravelStyle { get; set; }
    public List<string>? Interests { get; set; }
    public string? BudgetStyle { get; set; }
    public string? ActivityPace { get; set; }
    public string? TransportPreference { get; set; }
}

