using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized();
        }

        if (!IsAdmin() && trip.UserId.HasValue && trip.UserId.Value != currentUserId.Value)
        {
            return Forbid();
        }

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

        if (!IsAdmin() || !trip.UserId.HasValue)
        {
            trip.UserId = currentUserId.Value;
        }

        trip.TravelScope = trip.TravelScope == "International" ? "International" : "Local";
        trip.PassportRequired = trip.TravelScope == "International";
        trip.OriginalReturnDate ??= trip.ReturnDate;
        trip.ReturnBudgetReserve = Math.Max(0, trip.ReturnBudgetReserve);
        trip.FoodBudget = Math.Max(0, trip.FoodBudget);

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
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized();
        }

        var query = _context.Trips.AsQueryable();
        if (!IsAdmin())
        {
            query = query.Where(t => t.UserId == currentUserId.Value);
        }

        var trip = await query.FirstOrDefaultAsync(t => t.Id == id);

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

        if (!currentUserId.HasValue)
        {
            return Unauthorized();
        }

        if (!isAdmin && trip.UserId != currentUserId.Value)
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
        trip.SpentAmount = updated.SpentAmount;
        trip.FoodBudget = updated.FoodBudget;
        trip.ReturnBudgetReserve = updated.ReturnBudgetReserve;
        trip.TravellerCount = updated.TravellerCount;
        trip.TripType = updated.TripType;
        trip.TravelScope = updated.TravelScope == "International" ? "International" : "Local";
        trip.PassportRequired = trip.TravelScope == "International";
        trip.TravelInsuranceRequired = updated.TravelInsuranceRequired;
        trip.ReadinessChecksComplete = updated.ReadinessChecksComplete;
        trip.BaggagePlan = updated.BaggagePlan;
        trip.OriginalReturnDate = updated.OriginalReturnDate;
        trip.ReturnTransport = updated.ReturnTransport;
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

        if (!currentUserId.HasValue)
        {
            return Unauthorized();
        }

        if (!isAdmin && trip.UserId != currentUserId.Value)
        {
            return Forbid();
        }

        _context.Trips.Remove(trip);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    public class CompleteTripDto
    {
        public string CompletionMethod { get; set; } = "MANUAL"; // "LOCATION" or "MANUAL"
        public double? CurrentLatitude { get; set; }
        public double? CurrentLongitude { get; set; }
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteTrip(int id, [FromBody] CompleteTripDto dto)
    {
        var trip = await _context.Trips.FindAsync(id);
        if (trip == null)
        {
            return NotFound($"Trip with ID {id} was not found.");
        }

        var currentUserId = GetCurrentUserId();
        // Only the trip owner can perform this action.
        if (currentUserId.HasValue && trip.UserId.HasValue && trip.UserId.Value != currentUserId.Value)
        {
            return Forbid();
        }

        // Prevent duplicate completion
        if (trip.Status == "COMPLETED")
        {
            return Ok(new
            {
                message = $"Trip to {trip.Destination} was already completed.",
                destination = trip.Destination,
                completedAt = trip.CompletedAt,
                completionMethod = trip.CompletionMethod,
                trip,
                isAlreadyCompleted = true
            });
        }

        var method = (dto.CompletionMethod ?? "MANUAL").Trim().ToUpperInvariant();

        if (method == "LOCATION")
        {
            if (!dto.CurrentLatitude.HasValue || !dto.CurrentLongitude.HasValue)
            {
                return BadRequest(new { message = "Device latitude and longitude are required for live location arrival detection." });
            }

            double destLat = trip.DestinationLatitude ?? 0;
            double destLon = trip.DestinationLongitude ?? 0;

            if (destLat == 0 && destLon == 0)
            {
                (destLat, destLon) = GetKnownCoordinates(trip.Destination);
            }

            if (destLat == 0 && destLon == 0)
            {
                return BadRequest(new { message = $"Destination coordinates for '{trip.Destination}' could not be resolved. Please use manual completion." });
            }

            var distanceKm = CalculateHaversineDistanceKm(dto.CurrentLatitude.Value, dto.CurrentLongitude.Value, destLat, destLon);
            var distanceMeters = Math.Round(distanceKm * 1000);

            // Live arrival detection: within 500 metres (0.5 km)
            if (distanceKm > 0.5)
            {
                return BadRequest(new
                {
                    message = $"You are {distanceMeters:N0} metres away from {trip.Destination}. Live arrival detection requires being within 500 metres.",
                    distanceMeters,
                    destination = trip.Destination
                });
            }
        }

        trip.Status = "COMPLETED";
        trip.CompletedAt = DateTime.UtcNow;
        trip.CompletionMethod = method;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"🎉 Congratulations! You've reached {trip.Destination}.",
            destination = trip.Destination,
            completedAt = trip.CompletedAt,
            completionMethod = trip.CompletionMethod,
            trip
        });
    }

    private static (double Lat, double Lon) GetKnownCoordinates(string destination)
    {
        var d = destination.Trim().ToLowerInvariant();
        if (d.Contains("ella")) return (6.8667, 81.0466);
        if (d.Contains("colombo")) return (6.9271, 79.8612);
        if (d.Contains("kandy")) return (7.2906, 80.6337);
        if (d.Contains("galle")) return (6.0535, 80.2210);
        if (d.Contains("nuwara")) return (6.9497, 80.7891);
        if (d.Contains("sigiriya")) return (7.9570, 80.7603);
        if (d.Contains("jaffna")) return (9.6615, 80.0255);
        if (d.Contains("mirissa")) return (5.9482, 80.4578);
        return (0, 0);
    }

    private static double CalculateHaversineDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}