using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Reviewer")]
public class AdminController : ControllerBase
{
    private readonly TravelWiseDbContext _context;

    public AdminController(TravelWiseDbContext context)
    {
        _context = context;
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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
    [Authorize(Roles = "Admin")]
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
        var totalWorkflows = await _context.AIWorkflows.CountAsync();
        var pendingApprovals = await _context.AIWorkflows.CountAsync(w => w.ApprovalStatus == "PENDING" || w.Status == "AWAITING_APPROVAL");

        return Ok(new
        {
            totalUsers,
            activeUsers,
            travellerUsers,
            totalTrips,
            totalAllocatedBudget,
            totalActivities,
            totalWorkflows,
            pendingApprovals
        });
    }

    // ----------------------------------------------------------------------
    // ALL TRIPS MANAGEMENT: GET /api/Admin/trips
    // ----------------------------------------------------------------------
    [HttpGet("trips")]
    public async Task<IActionResult> GetAllTrips([FromQuery] string? search = null)
    {
        var query = from t in _context.Trips
                    join u in _context.Users on t.UserId equals u.Id into userGroup
                    from u in userGroup.DefaultIfEmpty()
                    select new
                    {
                        t.Id,
                        t.StartingPlace,
                        t.Destination,
                        t.StartDate,
                        t.ReturnDate,
                        t.BudgetAmount,
                        t.SpentAmount,
                        t.FoodBudget,
                        t.AccommodationBudget,
                        t.ReturnBudgetReserve,
                        t.TravellerCount,
                        t.TripType,
                        t.TravelScope,
                        t.Status,
                        t.CreatedAt,
                        t.CompletedAt,
                        t.CompletionMethod,
                        t.EstimatedDistanceKm,
                        t.SelectedTransport,
                        UserId = t.UserId,
                        OwnerName = u != null ? (u.FullName ?? u.Username) : "Unassigned",
                        OwnerEmail = u != null ? u.Email : ""
                    };

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.ILike(t.Destination, pattern) ||
                EF.Functions.ILike(t.StartingPlace, pattern) ||
                EF.Functions.ILike(t.OwnerName, pattern));
        }

        var trips = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(trips);
    }

    // ----------------------------------------------------------------------
    // ALL AI WORKFLOWS: GET /api/Admin/workflows
    // ----------------------------------------------------------------------
    [HttpGet("workflows")]
    public async Task<IActionResult> GetAllWorkflows([FromQuery] string? status = null)
    {
        var query = from w in _context.AIWorkflows
                    join t in _context.Trips on w.TripId equals t.Id into tripGroup
                    from t in tripGroup.DefaultIfEmpty()
                    join u in _context.Users on (t != null ? t.UserId : 0) equals u.Id into userGroup
                    from u in userGroup.DefaultIfEmpty()
                    select new
                    {
                        w.Id,
                        w.TripId,
                        w.Status,
                        w.ApprovalStatus,
                        w.ValidationPassed,
                        w.Reviewer,
                        w.ApprovalComment,
                        w.CreatedAt,
                        w.UpdatedAt,
                        Destination = t != null ? t.Destination : "Unknown",
                        StartingPlace = t != null ? t.StartingPlace : "",
                        StartDate = t != null ? (DateTime?)t.StartDate : null,
                        ReturnDate = t != null ? (DateTime?)t.ReturnDate : null,
                        BudgetAmount = t != null ? t.BudgetAmount : 0m,
                        TripType = t != null ? t.TripType : "",
                        TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                        TravellerEmail = u != null ? u.Email : ""
                    };

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(w => w.ApprovalStatus == status || w.Status == status);
        }

        var workflows = await query.OrderByDescending(w => w.CreatedAt).ToListAsync();
        return Ok(workflows);
    }

    // ----------------------------------------------------------------------
    // WORKFLOW DETAIL FOR REVIEW: GET /api/Admin/workflows/{id}
    // ----------------------------------------------------------------------
    [HttpGet("workflows/{id}")]
    public async Task<IActionResult> GetWorkflowDetail(int id)
    {
        var workflow = await _context.AIWorkflows
            .Include(w => w.Trip)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
        {
            return NotFound(new { message = $"Workflow with ID {id} was not found." });
        }

        var user = workflow.Trip?.UserId.HasValue == true
            ? await _context.Users.FindAsync(workflow.Trip.UserId.Value)
            : null;

        var auditLogs = await _context.WorkflowAuditLogs
            .Where(a => a.AIWorkflowId == id)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        return Ok(new
        {
            Workflow = workflow,
            Traveller = user != null ? new
            {
                user.Id,
                user.Username,
                FullName = user.FullName ?? user.Username,
                user.Email,
                user.TravelStyle,
                user.BudgetStyle,
                user.Interests
            } : null,
            AuditLogs = auditLogs
        });
    }

    // ----------------------------------------------------------------------
    // REVIEWER APPROVAL / REQUEST CHANGES / REJECT
    // POST /api/Admin/workflows/{id}/approval
    // ----------------------------------------------------------------------
    [HttpPost("workflows/{id}/approval")]
    public async Task<IActionResult> ProcessWorkflowReview(int id, [FromBody] WorkflowApprovalRequest request)
    {
        var workflow = await _context.AIWorkflows.FindAsync(id);
        if (workflow == null)
        {
            return NotFound(new { message = $"Workflow with ID {id} was not found." });
        }

        var decision = (request.Decision ?? "").Trim().ToUpper();
        if (decision != "APPROVE" && decision != "REJECT" && decision != "REQUEST_CHANGES" && decision != "REQUEST CHANGES" && decision != "REVISE")
        {
            return BadRequest(new { message = "Decision must be APPROVE, REQUEST_CHANGES, or REJECT." });
        }

        var comment = (request.Comment ?? "").Trim();
        if ((decision == "REQUEST_CHANGES" || decision == "REQUEST CHANGES" || decision == "REVISE") && string.IsNullOrWhiteSpace(comment))
        {
            return BadRequest(new { message = "A comment is required when requesting changes." });
        }

        if (decision == "REJECT" && string.IsNullOrWhiteSpace(comment))
        {
            return BadRequest(new { message = "A reason/comment is required when rejecting a plan." });
        }

        var reviewerEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.Name) ?? request.Reviewer ?? "Reviewer";
        var reviewerRole = User.FindFirstValue(ClaimTypes.Role) ?? "Reviewer";

        workflow.Reviewer = $"{reviewerEmail} ({reviewerRole})";
        workflow.ApprovalComment = comment;
        workflow.UpdatedAt = DateTime.UtcNow;

        if (decision == "APPROVE")
        {
            workflow.ApprovalStatus = "APPROVED";
            workflow.Status = "COMPLETED";
        }
        else if (decision == "REJECT")
        {
            workflow.ApprovalStatus = "REJECTED";
            workflow.Status = "REJECTED";
        }
        else
        {
            workflow.ApprovalStatus = "CHANGES_REQUESTED";
            workflow.Status = "REVISION_REQUIRED";
        }

        _context.WorkflowAuditLogs.Add(new WorkflowAuditLog
        {
            AIWorkflowId = workflow.Id,
            EventType = $"WORKFLOW_{decision.Replace(" ", "_")}",
            Message = $"Decision: {decision}. Note: {(string.IsNullOrWhiteSpace(comment) ? "No comment" : comment)}",
            Actor = $"{reviewerEmail} ({reviewerRole})",
            CreatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Workflow decision recorded: {workflow.ApprovalStatus}",
            workflow
        });
    }

    // ----------------------------------------------------------------------
    // AUDIT HISTORY: GET /api/Admin/audit-history
    // ----------------------------------------------------------------------
    [HttpGet("audit-history")]
    public async Task<IActionResult> GetAuditHistory([FromQuery] int? workflowId = null, [FromQuery] string? search = null)
    {
        var query = from a in _context.WorkflowAuditLogs
                    join w in _context.AIWorkflows on a.AIWorkflowId equals w.Id into wfGroup
                    from w in wfGroup.DefaultIfEmpty()
                    join t in _context.Trips on (w != null ? w.TripId : 0) equals t.Id into tripGroup
                    from t in tripGroup.DefaultIfEmpty()
                    select new
                    {
                        a.Id,
                        a.AIWorkflowId,
                        a.EventType,
                        a.Message,
                        a.Actor,
                        a.CreatedAt,
                        TripId = w != null ? (int?)w.TripId : null,
                        Destination = t != null ? t.Destination : "",
                        WorkflowStatus = w != null ? w.Status : ""
                    };

        if (workflowId.HasValue)
        {
            query = query.Where(a => a.AIWorkflowId == workflowId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(a =>
                EF.Functions.ILike(a.EventType, pattern) ||
                EF.Functions.ILike(a.Message, pattern) ||
                (a.Actor != null && EF.Functions.ILike(a.Actor, pattern)) ||
                EF.Functions.ILike(a.Destination, pattern));
        }

        var logs = await query.OrderByDescending(a => a.CreatedAt).Take(100).ToListAsync();
        return Ok(logs);
    }
}
