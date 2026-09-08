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
    public async Task<ActionResult<IEnumerable<Trip>>> GetTrips()
    {
        return await _context.Trips.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Trip>> CreateTrip(Trip trip)
    {
        _context.Trips.Add(trip);

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTrips), new { id = trip.Id }, trip);
    }

    
    [HttpGet("{id}")]
     public async Task<ActionResult<Trip>> GetTrip(int id)
    {
       var trip = await _context.Trips.FindAsync(id);

         if (trip == null)
    {
         return NotFound();
    }

    return trip;
}
}