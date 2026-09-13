using System.Security.Claims;
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

    public AuthController(TravelWiseDbContext context, AuthService authService)
    {
        _context = context;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        var existingUser = await _context.Users
            .AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower() || u.Email.ToLower() == dto.Email.ToLower());

        if (existingUser)
        {
            return BadRequest(new { message = "Username or Email already exists." });
        }

        var validRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Traveller", "Reviewer", "Admin" };
        var role = validRoles.Contains(dto.Role) ? dto.Role : "Traveller";

        var user = new User
        {
            Username = dto.Username.Trim(),
            Email = dto.Email.Trim().ToLowerInvariant(),
            PasswordHash = _authService.HashPassword(dto.Password),
            Role = role,
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
            Role = user.Role,
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

        var token = _authService.GenerateJwtToken(user, out var expiresAt);

        return Ok(new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = expiresAt
        });
    }

    [HttpPost("seed-demo-users")]
    public async Task<IActionResult> SeedDemoUsers()
    {
        var created = new List<string>();

        var demoUsers = new[]
        {
            ("traveller", "traveller@travelwise.lk", "Traveller123!", "Traveller"),
            ("reviewer", "reviewer@travelwise.lk", "Reviewer123!", "Reviewer"),
            ("admin", "admin@travelwise.lk", "Admin123!", "Admin")
        };

        foreach (var (username, email, password, role) in demoUsers)
        {
            var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username);
            if (!exists)
            {
                var user = new User
                {
                    Username = username,
                    Email = email,
                    PasswordHash = _authService.HashPassword(password),
                    Role = role,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                created.Add(username);
            }
        }

        if (created.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            message = "Demo users checked/seeded successfully.",
            createdCount = created.Count,
            demoCredentials = new[]
            {
                new { Username = "traveller", Password = "Traveller123!", Role = "Traveller" },
                new { Username = "reviewer", Password = "Reviewer123!", Role = "Reviewer" },
                new { Username = "admin", Password = "Admin123!", Role = "Admin" }
            }
        });
    }

    [HttpGet("me")]
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

        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            CreatedAt = user.CreatedAt
        });
    }
}
