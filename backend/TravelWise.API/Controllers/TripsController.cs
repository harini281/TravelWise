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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Trip>>> GetTrips([FromQuery] string? search = null)
    {
        var query = _context.Trips.AsQueryable();

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

        _context.Trips.Remove(trip);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}