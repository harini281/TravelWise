using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TripsController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public TripsController(TravelWiseDbContext context)
    {
        _context = context;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsAdmin()
    {
        return User.IsInRole("Admin") || User.FindFirst(ClaimTypes.Role)?.Value == "Admin";
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Trip>>> GetTrips([FromQuery] string? search = null, [FromQuery] int? userId = null)
    {
        var query = _context.Trips.AsQueryable();

        var currentUserId = GetCurrentUserId();
        var isAdmin = IsAdmin();

        if (isAdmin && userId.HasValue)
        {
            query = query.Where(t => t.UserId == userId.Value);
        }
        else if (currentUserId.HasValue && !isAdmin)
        {
            query = query.Where(t => t.UserId == currentUserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.ILike(t.Destination, pattern) ||
                EF.Functions.ILike(t.StartingPlace, pattern) ||
                EF.Functions.ILike(t.TripType, pattern) ||
                EF.Functions.ILike(t.Status, pattern));
        }

        return await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Trip>> CreateTrip([FromBody] Trip trip)
    {
        if (trip.ReturnDate < trip.StartDate)
        {
            return BadRequest("Return date must be on or after the start date.");
        }

        if (trip.BudgetAmount < 0)
        {
            return BadRequest("Budget amount cannot be negative.");
        }

        if (trip.TravellerCount <= 0)
        {
            return BadRequest("Traveller count must be at least 1.");
        }

        var currentUserId = GetCurrentUserId();
        if (currentUserId.HasValue && !trip.UserId.HasValue)
        {
            trip.UserId = currentUserId.Value;
        }

        trip.StartDate = DateTime.SpecifyKind(trip.StartDate, DateTimeKind.Utc);
        trip.ReturnDate = DateTime.SpecifyKind(trip.ReturnDate, DateTimeKind.Utc);
        trip.CreatedAt = DateTime.UtcNow;

        _context.Trips.Add(trip);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrip), new { id = trip.Id }, trip);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Trip>> GetTrip(int id)
    {
        var trip = await _context.Trips.FindAsync(id);

        if (trip == null)
        {
            return NotFound($"Trip with ID {id} was not found.");
        }

        return Ok(trip);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Trip>> UpdateTrip(int id, [FromBody] Trip updated)
    {
        var trip = await _context.Trips.FindAsync(id);

        if (trip == null)
        {
            return NotFound($"Trip with ID {id} was not found.");
        }

        var currentUserId = GetCurrentUserId();
        var isAdmin = IsAdmin();

        if (currentUserId.HasValue && !isAdmin && trip.UserId.HasValue && trip.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        if (updated.ReturnDate < updated.StartDate)
        {
            return BadRequest("Return date must be on or after the start date.");
        }

        if (updated.BudgetAmount < 0)
        {
            return BadRequest("Budget amount cannot be negative.");
        }

        if (updated.TravellerCount <= 0)
        {
            return BadRequest("Traveller count must be at least 1.");
        }

        trip.StartingPlace = updated.StartingPlace;
        trip.Destination = updated.Destination;
        trip.StartDate = DateTime.SpecifyKind(updated.StartDate, DateTimeKind.Utc);
        trip.ReturnDate = DateTime.SpecifyKind(updated.ReturnDate, DateTimeKind.Utc);
        trip.BudgetAmount = updated.BudgetAmount;
        trip.TravellerCount = updated.TravellerCount;
        trip.TripType = updated.TripType;
        trip.Status = updated.Status;

        if (updated.SelectedTransport != null) trip.SelectedTransport = updated.SelectedTransport;
        if (updated.EstimatedDistanceKm.HasValue) trip.EstimatedDistanceKm = updated.EstimatedDistanceKm;
        if (updated.EstimatedDurationMinutes.HasValue) trip.EstimatedDurationMinutes = updated.EstimatedDurationMinutes;
        if (updated.EstimatedTransportCost.HasValue) trip.EstimatedTransportCost = updated.EstimatedTransportCost;
        if (updated.StartLatitude.HasValue) trip.StartLatitude = updated.StartLatitude;
        if (updated.StartLongitude.HasValue) trip.StartLongitude = updated.StartLongitude;
        if (updated.DestinationLatitude.HasValue) trip.DestinationLatitude = updated.DestinationLatitude;
        if (updated.DestinationLongitude.HasValue) trip.DestinationLongitude = updated.DestinationLongitude;
        if (updated.RouteGeometryJson != null) trip.RouteGeometryJson = updated.RouteGeometryJson;

        await _context.SaveChangesAsync();

        return Ok(trip);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTrip(int id)
    {
        var trip = await _context.Trips.FindAsync(id);

        if (trip == null)
        {
            return NotFound($"Trip with ID {id} was not found.");
        }

        var currentUserId = GetCurrentUserId();
        var isAdmin = IsAdmin();

        if (currentUserId.HasValue && !isAdmin && trip.UserId.HasValue && trip.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        _context.Trips.Remove(trip);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}