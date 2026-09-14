using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public AdminController(TravelWiseDbContext context)
    {
        _context = context;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? search = null, [FromQuery] string? role = null)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, pattern) ||
                EF.Functions.ILike(u.Email, pattern) ||
                (u.FullName != null && EF.Functions.ILike(u.FullName, pattern)));
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.Role == role);
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                u.FullName,
                u.Role,
                u.IsActive,
                u.HasCompletedOnboarding,
                u.TravelStyle,
                u.BudgetStyle,
                u.TransportPreference,
                u.CreatedAt,
                TripCount = _context.Trips.Count(t => t.UserId == u.Id)
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("users/{id}/trips")]
    public async Task<IActionResult> GetUserTrips(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found." });
        }

        var trips = await _context.Trips
            .Where(t => t.UserId == id)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return Ok(new
        {
            user = new
            {
                user.Id,
                user.Username,
                user.FullName,
                user.Email,
                user.Role,
                user.IsActive
            },
            trips
        });
    }

    public class UserStatusDto
    {
        public bool IsActive { get; set; }
    }

    [HttpPut("users/{id}/status")]
    public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UserStatusDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"User with ID {id} not found." });
        }

        var currentUserIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(currentUserIdClaim, out var currentUserId) && currentUserId == id && !dto.IsActive)
        {
            return BadRequest(new { message = "You cannot deactivate your own administrator account." });
        }

        user.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"User '{user.Username}' has been {(user.IsActive ? "activated" : "deactivated")}.",
            user = new
            {
                user.Id,
                user.Username,
                user.Email,
                user.Role,
                user.IsActive
            }
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetSystemStats()
    {
        var totalUsers = await _context.Users.CountAsync();
        var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
        var travellerUsers = await _context.Users.CountAsync(u => u.Role == "Traveller");
        var totalTrips = await _context.Trips.CountAsync();
        var totalAllocatedBudget = await _context.Trips.SumAsync(t => (decimal?)t.BudgetAmount) ?? 0m;
        var totalActivities = await _context.Activities.CountAsync();

        return Ok(new
        {
            totalUsers,
            activeUsers,
            travellerUsers,
            totalTrips,
            totalAllocatedBudget,
            totalActivities
        });
    }
}
