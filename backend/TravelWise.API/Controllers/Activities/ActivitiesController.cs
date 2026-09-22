using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivitiesController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public ActivitiesController(TravelWiseDbContext context)
    {
        _context = context;
    }

    // POST: api/Activities
    [HttpPost]
    public async Task<ActionResult<Activity>> CreateActivity(
        CreateActivityDto dto)
    {
        // Check whether the trip exists
        var trip = await _context.Trips
            .FindAsync(dto.TripId);

        if (trip == null)
        {
            return NotFound(
                $"Trip with ID {dto.TripId} was not found.");
        }

        // Check whether end time is after start time
        if (dto.ScheduledEnd <= dto.ScheduledStart)
        {
            return BadRequest(
                "Activity scheduled end time must be after the start time.");
        }

        // Check whether the activity is within the trip dates
        if (dto.ScheduledStart < trip.StartDate ||
            dto.ScheduledEnd > trip.ReturnDate)
        {
            return BadRequest(
                "Activity schedule must be within the trip dates.");
        }

        // Check for schedule conflicts
        var hasConflict = await _context.Activities
            .AnyAsync(a =>
                a.TripId == dto.TripId &&
                dto.ScheduledStart < a.ScheduledEnd &&
                dto.ScheduledEnd > a.ScheduledStart);

        if (hasConflict)
        {
            return BadRequest(
                "The activity schedule conflicts with an existing activity.");
        }

        // Create the activity
        var activity = new Activity
        {
            TripId = dto.TripId,
            Name = dto.Name,
            Category = dto.Category,
            Description = dto.Description,
            Location = dto.Location,
            EstimatedCost = dto.EstimatedCost,
            DurationMinutes = dto.DurationMinutes,
            ScheduledStart = dto.ScheduledStart,
            ScheduledEnd = dto.ScheduledEnd
        };

        _context.Activities.Add(activity);

        await _context.SaveChangesAsync();

        return Ok(activity);
    }

    // GET: api/Activities
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Activity>>> GetActivities()
    {
        return await _context.Activities.ToListAsync();
    }

    // GET: api/Activities/trip/{tripId}
    [HttpGet("trip/{tripId}")]
    public async Task<ActionResult<IEnumerable<Activity>>> GetActivitiesByTrip(
        int tripId)
    {
        // Check whether the trip exists
        var tripExists = await _context.Trips
            .AnyAsync(t => t.Id == tripId);

        if (!tripExists)
        {
            return NotFound(
                $"Trip with ID {tripId} was not found.");
        }

        var activities = await _context.Activities
            .Where(a => a.TripId == tripId)
            .ToListAsync();

        return Ok(activities);
    }

    // PUT: api/Activities/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<Activity>> UpdateActivity(
        int id,
        UpdateActivityDto dto)
    {
        // Find the existing activity
        var activity = await _context.Activities
            .FindAsync(id);

        if (activity == null)
        {
            return NotFound(
                $"Activity with ID {id} was not found.");
        }

        // Find the trip
        var trip = await _context.Trips
            .FindAsync(activity.TripId);

        if (trip == null)
        {
            return NotFound(
                $"Trip with ID {activity.TripId} was not found.");
        }

        // Check whether end time is after start time
        if (dto.ScheduledEnd <= dto.ScheduledStart)
        {
            return BadRequest(
                "Activity scheduled end time must be after the start time.");
        }

        // Check whether the updated activity is within trip dates
        if (dto.ScheduledStart < trip.StartDate ||
            dto.ScheduledEnd > trip.ReturnDate)
        {
            return BadRequest(
                "Activity schedule must be within the trip dates.");
        }

        // Check for schedule conflicts
        // Exclude the activity currently being updated
        var hasConflict = await _context.Activities
            .AnyAsync(a =>
                a.TripId == activity.TripId &&
                a.Id != id &&
                dto.ScheduledStart < a.ScheduledEnd &&
                dto.ScheduledEnd > a.ScheduledStart);

        if (hasConflict)
        {
            return BadRequest(
                "The activity schedule conflicts with an existing activity.");
        }

        // Update the activity
        activity.Name = dto.Name;
        activity.Category = dto.Category;
        activity.Description = dto.Description;
        activity.Location = dto.Location;
        activity.EstimatedCost = dto.EstimatedCost;
        activity.DurationMinutes = dto.DurationMinutes;
        activity.ScheduledStart = dto.ScheduledStart;
        activity.ScheduledEnd = dto.ScheduledEnd;

        await _context.SaveChangesAsync();

        return Ok(activity);
    }

    // DELETE: api/Activities/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(int id)
    {
        // Find the activity
        var activity = await _context.Activities
            .FindAsync(id);

        if (activity == null)
        {
            return NotFound(
                $"Activity with ID {id} was not found.");
        }

        // Delete the activity
        _context.Activities.Remove(activity);

        await _context.SaveChangesAsync();

        return NoContent();
    }
}