using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using TravelWise.API.Services;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TravelWiseDbContext _context;
    private readonly AuthService _authService;
    private readonly IEmailService _emailService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        TravelWiseDbContext context,
        AuthService authService,
        IEmailService emailService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _authService = authService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.ConfirmPassword) && dto.Password != dto.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        if (dto.Password.Length < 6)
        {
            return BadRequest(new { message = "Password must be at least 6 characters long." });
        }

        var existingUser = await _context.Users
            .AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower() || u.Email.ToLower() == dto.Email.ToLower());

        if (existingUser)
        {
            return BadRequest(new { message = "Username or Email already exists." });
        }

        // New users from public registration are ALWAYS assigned Traveller role
        var user = new User
        {
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            FullName = !string.IsNullOrWhiteSpace(dto.FullName) ? dto.FullName.Trim() : dto.Username.Trim(),
            PasswordHash = _authService.HashPassword(dto.Password),
            Role = "Traveller",
            HasCompletedOnboarding = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = _authService.GenerateJwtToken(user, out var expiresAt);

        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            ExpiresAt = expiresAt
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == dto.Username.ToLower() || u.Email.ToLower() == dto.Username.ToLower());

        if (user == null || !_authService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        if (!user.IsActive)
        {
            return StatusCode(403, new { message = "Your account has been deactivated. Please contact an administrator." });
        }

        var token = _authService.GenerateJwtToken(user, out var expiresAt);

        var interestsList = !string.IsNullOrWhiteSpace(user.Interests)
            ? user.Interests.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();

        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName ?? user.Username,
            Role = user.Role,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            TravelStyle = user.TravelStyle,
            Interests = interestsList,
            BudgetStyle = user.BudgetStyle,
            ExpiresAt = expiresAt
        });
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user != null)
        {
            var resetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            user.PasswordResetToken = resetToken;
            user.PasswordResetExpiry = DateTime.UtcNow.AddHours(1);
            await _context.SaveChangesAsync();

            await _emailService.SendPasswordResetEmailAsync(user.Email, resetToken);
        }

        // Generic response to prevent user enumeration
        return Ok(new
        {
            message = "If an account exists for this email, password reset instructions have been sent."
        });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.ConfirmPassword) && dto.NewPassword != dto.ConfirmPassword)
        {
            return BadRequest(new { message = "Passwords do not match." });
        }

        if (dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long." });
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null ||
            string.IsNullOrWhiteSpace(user.PasswordResetToken) ||
            user.PasswordResetToken != dto.Token ||
            user.PasswordResetExpiry == null ||
            user.PasswordResetExpiry < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired password reset token." });
        }

        // Invalidate single-use token and update password
        user.PasswordHash = _authService.HashPassword(dto.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetExpiry = null;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Password has been successfully reset. You may now sign in with your new password." });
    }

    [Authorize]
    [HttpGet("me")]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrEmpty(username))
        {
            return Unauthorized(new { message = "Not authenticated." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var interestsList = !string.IsNullOrWhiteSpace(user.Interests)
            ? user.Interests.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName ?? user.Username,
            Role = user.Role,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            TravelStyle = user.TravelStyle,
            Interests = interestsList,
            BudgetStyle = user.BudgetStyle,
            ActivityPace = user.ActivityPace,
            TransportPreference = user.TransportPreference,
            CreatedAt = user.CreatedAt
        });
    }

    [Authorize]
    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesDto dto)
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrEmpty(username))
        {
            return Unauthorized(new { message = "Not authenticated." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (dto.TravelStyle != null) user.TravelStyle = dto.TravelStyle.Trim();
        if (dto.Interests != null) user.Interests = string.Join(",", dto.Interests);
        if (dto.BudgetStyle != null) user.BudgetStyle = dto.BudgetStyle.Trim();
        if (dto.ActivityPace != null) user.ActivityPace = dto.ActivityPace.Trim();
        if (dto.TransportPreference != null) user.TransportPreference = dto.TransportPreference.Trim();

        user.HasCompletedOnboarding = true;

        await _context.SaveChangesAsync();

        var interestsList = !string.IsNullOrWhiteSpace(user.Interests)
            ? user.Interests.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : new List<string>();

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName ?? user.Username,
            Role = user.Role,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            TravelStyle = user.TravelStyle,
            Interests = interestsList,
            BudgetStyle = user.BudgetStyle,
            ActivityPace = user.ActivityPace,
            TransportPreference = user.TransportPreference,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost("seed-demo-users")]
    public async Task<IActionResult> SeedDemoUsers()
    {
        var demoUsers = new[]
        {
            ("traveller", "traveller@travelwise.lk", "Traveller123!", "Traveller", "Harini Ravichandran", true, "Adventure", "Nature,Hiking,Photography", "Balanced", "Balanced", "Train"),
            ("reviewer", "reviewer@travelwise.lk", "Reviewer123!", "Reviewer", "Chief Quality Reviewer", true, "Culture & History", "Historical Places,Museums", "Comfort", "Relaxed", "Car"),
            ("admin", "admin@travelwise.lk", "Admin123!", "Admin", "System Administrator", true, "Business", "Local Experiences", "Premium", "Packed", "Car")
        };

        var created = new List<string>();

        foreach (var (username, email, password, role, fullName, onboarding, style, interests, budget, pace, transport) in demoUsers)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username);
            if (user == null)
            {
                user = new User
                {
                    Username = username,
                    Email = email,
                    FullName = fullName,
                    PasswordHash = _authService.HashPassword(password),
                    Role = role,
                    HasCompletedOnboarding = onboarding,
                    TravelStyle = style,
                    Interests = interests,
                    BudgetStyle = budget,
                    ActivityPace = pace,
                    TransportPreference = transport,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                created.Add(username);
            }
            else
            {
                // Ensure profile preferences exist for existing demo accounts
                user.FullName ??= fullName;
                user.HasCompletedOnboarding = onboarding;
                user.TravelStyle ??= style;
                user.Interests ??= interests;
                user.BudgetStyle ??= budget;
                user.ActivityPace ??= pace;
                user.TransportPreference ??= transport;
                user.IsActive = true;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Demo users checked and seeded successfully.",
            createdCount = created.Count,
            demoCredentials = new[]
            {
                new { Username = "traveller", Password = "Traveller123!", Role = "Traveller" },
                new { Username = "reviewer", Password = "Reviewer123!", Role = "Reviewer" },
                new { Username = "admin", Password = "Admin123!", Role = "Admin" }
            }
        });
    }
}
