using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReadinessController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public ReadinessController(TravelWiseDbContext context)
    {
        _context = context;
    }

    // CREATE TRAVEL REQUIREMENT
    [HttpPost("requirements")]
    public async Task<IActionResult> CreateRequirement(
        CreateTravelRequirementDto dto)
    {
        var tripExists = await _context.Trips
            .AnyAsync(t => t.Id == dto.TripId);

        if (!tripExists)
        {
            return NotFound("Trip not found.");
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest("Requirement name is required.");
        }

        var requirement = new TravelRequirement
        {
            TripId = dto.TripId,
            Name = dto.Name,
            Description = dto.Description,
            IsRequired = dto.IsRequired,
            Deadline = dto.Deadline,
            CreatedAt = DateTime.UtcNow
        };

        _context.TravelRequirements.Add(requirement);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            requirement.Id,
            requirement.TripId,
            requirement.Name,
            requirement.Description,
            requirement.IsRequired,
            requirement.Deadline,
            requirement.CreatedAt
        });
    }

    // CREATE READINESS ITEM
    [HttpPost("items")]
    public async Task<IActionResult> CreateItem(
        CreateReadinessItemDto dto)
    {
        var requirement = await _context.TravelRequirements
            .FirstOrDefaultAsync(r =>
                r.Id == dto.TravelRequirementId &&
                r.TripId == dto.TripId);

        if (requirement == null)
        {
            return BadRequest(
                "Requirement does not belong to this trip.");
        }

        var allowedStatuses = new[]
        {
            "PENDING",
            "COMPLETED",
            "MISSING",
            "EXPIRED"
        };

        var status = dto.Status.ToUpperInvariant();

        if (!allowedStatuses.Contains(status))
        {
            return BadRequest("Invalid readiness status.");
        }

        var item = new ReadinessItem
        {
            TripId = dto.TripId,
            TravelRequirementId = dto.TravelRequirementId,
            Status = status,
            Notes = dto.Notes,
            CompletedAt = status == "COMPLETED"
                ? DateTime.UtcNow
                : null,
            CreatedAt = DateTime.UtcNow
        };

        _context.ReadinessItems.Add(item);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            item.Id,
            item.TripId,
            item.TravelRequirementId,
            RequirementName = requirement.Name,
            item.Status,
            item.Notes,
            item.CompletedAt,
            item.CreatedAt
        });
    }

    // UPDATE READINESS ITEM
    [HttpPut("items/{id}")]
    public async Task<IActionResult> UpdateItem(
        int id,
        UpdateReadinessItemDto dto)
    {
        var item = await _context.ReadinessItems
            .FirstOrDefaultAsync(i => i.Id == id);

        if (item == null)
        {
            return NotFound("Readiness item not found.");
        }

        var allowedStatuses = new[]
        {
            "PENDING",
            "COMPLETED",
            "MISSING",
            "EXPIRED"
        };

        var status = dto.Status.ToUpperInvariant();

        if (!allowedStatuses.Contains(status))
        {
            return BadRequest("Invalid readiness status.");
        }

        item.Status = status;
        item.Notes = dto.Notes;

        item.CompletedAt = status == "COMPLETED"
            ? item.CompletedAt ?? DateTime.UtcNow
            : null;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            item.Id,
            item.TripId,
            item.TravelRequirementId,
            item.Status,
            item.Notes,
            item.CompletedAt,
            item.CreatedAt
        });
    }

    // GET ALL READINESS DATA FOR A TRIP
    [HttpGet("trip/{tripId}")]
    public async Task<IActionResult> GetTripReadiness(
        int tripId)
    {
        var tripExists = await _context.Trips
            .AnyAsync(t => t.Id == tripId);

        if (!tripExists)
        {
            return NotFound("Trip not found.");
        }

        var requirements = await _context.TravelRequirements
            .Where(r => r.TripId == tripId)
            .OrderBy(r => r.Id)
            .Select(r => new
            {
                r.Id,
                r.TripId,
                r.Name,
                r.Description,
                r.IsRequired,
                r.Deadline,
                r.CreatedAt
            })
            .ToListAsync();

        var items = await _context.ReadinessItems
            .Where(i => i.TripId == tripId)
            .OrderBy(i => i.Id)
            .Select(i => new
            {
                i.Id,
                i.TripId,
                i.TravelRequirementId,
                RequirementName = i.TravelRequirement.Name,
                i.Status,
                i.Notes,
                i.CompletedAt,
                i.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            TripId = tripId,
            Requirements = requirements,
            Items = items
        });
    }

    // DETERMINISTIC READINESS ASSESSMENT
    [HttpPost("assess/trip/{tripId}")]
    public async Task<IActionResult> AssessReadiness(
        int tripId)
    {
        var tripExists = await _context.Trips
            .AnyAsync(t => t.Id == tripId);

        if (!tripExists)
        {
            return NotFound("Trip not found.");
        }

        var requirements = await _context.TravelRequirements
            .Where(r =>
                r.TripId == tripId &&
                r.IsRequired)
            .ToListAsync();

        if (requirements.Count == 0)
        {
            return BadRequest(
                "No required travel requirements found for this trip.");
        }

        var requirementIds = requirements
            .Select(r => r.Id)
            .ToList();

        var items = await _context.ReadinessItems
            .Where(i =>
                i.TripId == tripId &&
                requirementIds.Contains(
                    i.TravelRequirementId))
            .ToListAsync();

        var completedRequirementIds = items
            .Where(i => i.Status == "COMPLETED")
            .Select(i => i.TravelRequirementId)
            .Distinct()
            .ToHashSet();

        var total = requirements.Count;

        var completed = requirements.Count(r =>
            completedRequirementIds.Contains(r.Id));

        var missing = total - completed;

        var score = (int)Math.Round(
            (double)completed / total * 100);

        string level;

        if (score >= 80)
        {
            level = "READY";
        }
        else if (score >= 50)
        {
            level = "PARTIALLY_READY";
        }
        else
        {
            level = "NOT_READY";
        }

        var summary =
            $"{completed} of {total} required travel requirements " +
            $"are completed.";

        var assessment = new ReadinessAssessment
        {
            TripId = tripId,
            ReadinessScore = score,
            ReadinessLevel = level,
            TotalRequirements = total,
            CompletedRequirements = completed,
            MissingRequirements = missing,
            Summary = summary,
            AssessedAt = DateTime.UtcNow
        };

        _context.ReadinessAssessments.Add(assessment);
        await _context.SaveChangesAsync();

        var result = new ReadinessAssessmentDto
        {
            TripId = tripId,
            ReadinessScore = score,
            ReadinessLevel = level,
            TotalRequirements = total,
            CompletedRequirements = completed,
            MissingRequirements = missing,
            Summary = summary
        };

        return Ok(result);
    }
}