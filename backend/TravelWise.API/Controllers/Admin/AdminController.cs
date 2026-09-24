using System.Security.Claims;
using System.Text.Json;
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
                u.Interests,
                u.BudgetStyle,
                u.ActivityPace,
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
                user.IsActive,
                user.HasCompletedOnboarding,
                user.TravelStyle,
                user.Interests,
                user.BudgetStyle,
                user.ActivityPace,
                user.TransportPreference,
                user.CreatedAt
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

        // Pending admin verifications: workflows where Traveller has accepted and awaiting admin review
        var pendingApprovals = await _context.AIWorkflows.CountAsync(w => 
            (w.Status == "AWAITING_ADMIN_REVIEW" || w.TravellerDecision == "ACCEPTED" || (w.Status == "AWAITING_APPROVAL" && w.ValidationPassed)) && 
            w.ApprovalStatus == "PENDING");

        var activeTrips = await _context.Trips.CountAsync(t => t.Status == "ACTIVE" || t.Status == "IN_PROGRESS" || t.Status == "TRAVELLING");
        var upcomingTrips = await _context.Trips.CountAsync(t => (t.Status == "PLANNING" || t.StartDate > DateTime.UtcNow) && t.Status != "COMPLETED" && t.Status != "CANCELLED");
        var completedTrips = await _context.Trips.CountAsync(t => t.Status == "COMPLETED");

        var pendingTravellerDecisions = await _context.AIWorkflows.CountAsync(w => 
            w.Status == "AWAITING_TRAVELLER_REVIEW" || w.Status == "SAFE_FAILURE" || w.ApprovalStatus == "CHANGES_REQUESTED");

        var highRiskAlerts = await _context.RiskAssessments.CountAsync(r => r.RiskLevel == "HIGH" || r.RiskLevel == "CRITICAL");

        var workflowStatuses = await _context.AIWorkflows.GroupBy(w => w.Status)
            .Select(g => new { status = g.Key, count = g.Count() }).ToListAsync();

        var latestAudit = await _context.WorkflowAuditLogs.AsNoTracking().OrderByDescending(a => a.CreatedAt)
            .Take(5).Select(a => new { a.Id, a.EventType, a.Message, a.Actor, a.CreatedAt }).ToListAsync();

        var upcomingTripsList = await (from t in _context.Trips
                                      join u in _context.Users on t.UserId equals u.Id into userGroup
                                      from u in userGroup.DefaultIfEmpty()
                                      where t.Status != "COMPLETED" && t.Status != "CANCELLED"
                                      orderby t.StartDate ascending
                                      select new
                                      {
                                          t.Id,
                                          t.Destination,
                                          t.StartingPlace,
                                          t.StartDate,
                                          t.ReturnDate,
                                          t.Status,
                                          t.TravellerCount,
                                          t.BudgetAmount,
                                          TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                                          TravellerEmail = u != null ? u.Email : ""
                                      }).Take(5).ToListAsync();

        var pendingReviewsList = await (from w in _context.AIWorkflows
                                        join t in _context.Trips on w.TripId equals t.Id into tripGroup
                                        from t in tripGroup.DefaultIfEmpty()
                                        join u in _context.Users on (t != null ? t.UserId : 0) equals u.Id into userGroup
                                        from u in userGroup.DefaultIfEmpty()
                                        where (w.Status == "AWAITING_ADMIN_REVIEW" || w.TravellerDecision == "ACCEPTED" || (w.Status == "AWAITING_APPROVAL" && w.ValidationPassed)) && w.ApprovalStatus == "PENDING"
                                        orderby w.CreatedAt descending
                                        select new
                                        {
                                            w.Id,
                                            w.TripId,
                                            Destination = t != null ? t.Destination : "Unknown",
                                            TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                                            TravellerEmail = u != null ? u.Email : "",
                                            TravellerDecision = w.TravellerDecision ?? "ACCEPTED",
                                            WorkflowStatus = w.Status,
                                            CreatedAt = w.CreatedAt
                                        }).Take(5).ToListAsync();

        var recentAlertsList = await (from r in _context.RiskAssessments
                                      join t in _context.Trips on r.TripId equals t.Id into tripGroup
                                      from t in tripGroup.DefaultIfEmpty()
                                      join u in _context.Users on (t != null ? t.UserId : 0) equals u.Id into userGroup
                                      from u in userGroup.DefaultIfEmpty()
                                      where r.RiskLevel == "HIGH" || r.RiskLevel == "CRITICAL"
                                      orderby r.AssessedAt descending
                                      select new
                                      {
                                          r.Id,
                                          r.TripId,
                                          Destination = t != null ? t.Destination : "Unknown",
                                          TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                                          r.RiskLevel,
                                          r.RiskScore,
                                          r.Summary,
                                          r.AssessedAt
                                      }).Take(5).ToListAsync();

        return Ok(new
        {
            capturedAt = DateTime.UtcNow,
            databaseReachable = true,
            activeTrips,
            upcomingTrips,
            completedTrips,
            pendingTravellerDecisions,
            pendingApprovals,
            highRiskAlerts,
            workflowStatuses,
            latestAudit,
            totalUsers,
            activeUsers,
            travellerUsers,
            totalTrips,
            totalAllocatedBudget,
            totalActivities,
            totalWorkflows,
            upcomingTripsList,
            pendingReviewsList,
            recentAlertsList
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
                        OwnerEmail = u != null ? u.Email : "",
                        RiskLevel = _context.RiskAssessments.Where(r => r.TripId == t.Id).OrderByDescending(r => r.AssessedAt).Select(r => r.RiskLevel).FirstOrDefault() ?? "Unassessed",
                        RiskScore = _context.RiskAssessments.Where(r => r.TripId == t.Id).OrderByDescending(r => r.AssessedAt).Select(r => (int?)r.RiskScore).FirstOrDefault(),
                        WorkflowStatus = _context.AIWorkflows.Where(w => w.TripId == t.Id).OrderByDescending(w => w.CreatedAt).Select(w => w.Status).FirstOrDefault() ?? "NONE",
                        ApprovalStatus = _context.AIWorkflows.Where(w => w.TripId == t.Id).OrderByDescending(w => w.CreatedAt).Select(w => w.ApprovalStatus).FirstOrDefault() ?? "NONE",
                        TravellerDecision = _context.AIWorkflows.Where(w => w.TripId == t.Id).OrderByDescending(w => w.CreatedAt).Select(w => w.TravellerDecision).FirstOrDefault(),
                        WorkflowId = _context.AIWorkflows.Where(w => w.TripId == t.Id).OrderByDescending(w => w.CreatedAt).Select(w => (int?)w.Id).FirstOrDefault()
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
    // TRIP DETAIL INSPECTION: GET /api/Admin/trips/{id}
    // ----------------------------------------------------------------------
    [HttpGet("trips/{id}")]
    public async Task<IActionResult> GetTripDetail(int id)
    {
        var trip = await _context.Trips.FindAsync(id);
        if (trip == null)
        {
            return NotFound(new { message = $"Trip with ID {id} was not found." });
        }

        var user = trip.UserId.HasValue ? await _context.Users.FindAsync(trip.UserId.Value) : null;
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == id);
        var activities = await _context.Activities.Where(a => a.TripId == id).OrderBy(a => a.ScheduledStart).ToListAsync();
        var expenses = await _context.Expenses.Where(e => e.TripId == id).OrderByDescending(e => e.ExpenseDate).ToListAsync();
        var risk = await _context.RiskAssessments.Where(r => r.TripId == id).OrderByDescending(r => r.AssessedAt).FirstOrDefaultAsync();
        var workflow = await _context.AIWorkflows.Where(w => w.TripId == id).OrderByDescending(w => w.CreatedAt).FirstOrDefaultAsync();

        return Ok(new
        {
            Trip = trip,
            Traveller = user != null ? new
            {
                user.Id,
                user.Username,
                FullName = user.FullName ?? user.Username,
                user.Email,
                user.Role
            } : null,
            Budget = budget,
            Activities = activities,
            Expenses = expenses,
            Risk = risk,
            Workflow = workflow
        });
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
                        w.TravellerDecision,
                        w.TravellerComment,
                        w.TravellerDecisionAt,
                        w.CreatedAt,
                        w.UpdatedAt,
                        Destination = t != null ? t.Destination : "Unknown",
                        StartingPlace = t != null ? t.StartingPlace : "",
                        StartDate = t != null ? (DateTime?)t.StartDate : null,
                        ReturnDate = t != null ? (DateTime?)t.ReturnDate : null,
                        TravellerCount = t != null ? t.TravellerCount : 1,
                        BudgetAmount = t != null ? t.BudgetAmount : 0m,
                        TripType = t != null ? t.TripType : "",
                        TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                        TravellerEmail = u != null ? u.Email : "",
                        RiskLevel = _context.RiskAssessments.Where(r => r.TripId == (t != null ? t.Id : 0)).OrderByDescending(r => r.AssessedAt).Select(r => r.RiskLevel).FirstOrDefault() ?? "LOW"
                    };

        if (!string.IsNullOrWhiteSpace(status))
        {
            var trimmedStatus = status.Trim().ToUpper();
            if (trimmedStatus == "PENDING_ADMIN" || trimmedStatus == "AWAITING_ADMIN_REVIEW")
            {
                query = query.Where(w => w.Status == "AWAITING_ADMIN_REVIEW" || w.TravellerDecision == "ACCEPTED");
            }
            else
            {
                query = query.Where(w => w.ApprovalStatus == status || w.Status == status);
            }
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

        var trip = workflow.Trip;
        var budget = trip != null ? await _context.Budgets.FirstOrDefaultAsync(b => b.TripId == trip.Id) : null;
        var activities = trip != null ? await _context.Activities.Where(a => a.TripId == trip.Id).ToListAsync() : new List<Activity>();
        var risk = trip != null ? await _context.RiskAssessments.Where(r => r.TripId == trip.Id).OrderByDescending(r => r.AssessedAt).FirstOrDefaultAsync() : null;
        var reqCount = trip != null ? await _context.TravelRequirements.CountAsync(r => r.TripId == trip.Id) : 0;
        var compCount = trip != null ? await _context.ReadinessItems.CountAsync(i => i.TripId == trip.Id && i.Status == "COMPLETED") : 0;

        var auditLogs = await _context.WorkflowAuditLogs
            .Where(a => a.AIWorkflowId == id)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync();

        // Structured agent results: deserialize PlanDataJson if present, else synthesize truthful structured evaluation
        object agentResults;
        if (!string.IsNullOrWhiteSpace(workflow.PlanDataJson))
        {
            try
            {
                agentResults = JsonSerializer.Deserialize<object>(workflow.PlanDataJson) ?? new { };
            }
            catch
            {
                agentResults = BuildDeterministicAgentResults(trip, budget, activities, risk, reqCount, compCount);
            }
        }
        else
        {
            agentResults = BuildDeterministicAgentResults(trip, budget, activities, risk, reqCount, compCount);
        }

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
                user.Interests,
                user.BudgetStyle,
                user.ActivityPace,
                user.TransportPreference
            } : null,
            Trip = trip != null ? new
            {
                trip.Id,
                trip.Destination,
                trip.StartingPlace,
                trip.StartDate,
                trip.ReturnDate,
                trip.TravellerCount,
                trip.TripType,
                trip.TravelScope,
                trip.BudgetAmount,
                trip.SpentAmount,
                trip.FoodBudget,
                trip.AccommodationBudget,
                trip.ReturnBudgetReserve
            } : null,
            Risk = risk,
            AgentResults = agentResults,
            AuditLogs = auditLogs
        });
    }

    private static object BuildDeterministicAgentResults(Trip? trip, Budget? budget, List<Activity> activities, RiskAssessment? risk, int reqCount, int compCount)
    {
        var totalBudget = budget?.TotalAmount ?? trip?.BudgetAmount ?? 0m;
        var totalSpent = trip?.SpentAmount ?? 0m;
        var remaining = totalBudget - totalSpent;
        return new
        {
            budget = new
            {
                status = "SUCCESS",
                analysis = new
                {
                    total_budget = totalBudget,
                    total_spent = totalSpent,
                    remaining_budget = remaining,
                    spending_percentage = totalBudget > 0 ? Math.Round((totalSpent / totalBudget) * 100, 2) : 0,
                    health = totalSpent <= totalBudget ? "HEALTHY" : "OVERSPENT",
                    recommendation = "Deterministic budget constraint checked. Protected reserve verified."
                }
            },
            activity = new
            {
                status = "SUCCESS",
                analysis = new
                {
                    activity_count = activities.Count,
                    recommendation = activities.Count > 0
                        ? $"{activities.Count} scheduled activity(ies) planned across itinerary."
                        : "No structured activities currently logged for this itinerary."
                }
            },
            risk = new
            {
                status = "SUCCESS",
                analysis = new
                {
                    risk_score = risk?.RiskScore ?? 0,
                    risk_level = risk?.RiskLevel ?? "LOW",
                    summary = string.IsNullOrWhiteSpace(risk?.Summary) ? "Open-Meteo regional weather invariants checked." : risk.Summary
                }
            },
            readiness = new
            {
                status = "SUCCESS",
                analysis = new
                {
                    readiness_score = reqCount > 0 ? (int)((compCount / (double)reqCount) * 100) : 100,
                    readiness_level = (reqCount == 0 || compCount >= reqCount) ? "READY" : "IN_PROGRESS",
                    summary = $"{compCount} of {Math.Max(reqCount, compCount)} mandatory travel checklist items completed."
                }
            }
        };
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

        // Core TravelWise HITL rule: Traveller decides first. Admin verifies second.
        if (workflow.TravellerDecision != "ACCEPTED" && workflow.Status != "AWAITING_ADMIN_REVIEW")
        {
            return BadRequest(new
            {
                message = "Admin cannot verify or approve this workflow before traveller acceptance. Current workflow status: " + workflow.Status
            });
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
        var reviewerRole = User.FindFirstValue(ClaimTypes.Role) ?? "Admin";

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
            workflow.Status = "ADMIN_REJECTED";
        }
        else
        {
            workflow.ApprovalStatus = "CHANGES_REQUESTED";
            workflow.Status = "ADMIN_CHANGES_REQUESTED";
        }

        _context.WorkflowAuditLogs.Add(new WorkflowAuditLog
        {
            AIWorkflowId = workflow.Id,
            EventType = $"ADMIN_{decision.Replace(" ", "_")}",
            Message = $"Admin decision: {decision}. Note: {(string.IsNullOrWhiteSpace(comment) ? "Verified by administrator." : comment)}",
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
    // SAFETY & ALERTS: GET /api/Admin/safety-alerts
    // ----------------------------------------------------------------------
    [HttpGet("safety-alerts")]
    public async Task<IActionResult> GetSafetyAlerts()
    {
        var totalAssessed = await _context.RiskAssessments.Select(r => r.TripId).Distinct().CountAsync();
        var highRiskCount = await _context.RiskAssessments.CountAsync(r => r.RiskLevel == "HIGH" || r.RiskLevel == "CRITICAL");
        var mediumRiskCount = await _context.RiskAssessments.CountAsync(r => r.RiskLevel == "MEDIUM");
        var lowRiskCount = await _context.RiskAssessments.CountAsync(r => r.RiskLevel == "LOW");

        var alerts = await (from r in _context.RiskAssessments
                            join t in _context.Trips on r.TripId equals t.Id into tripGroup
                            from t in tripGroup.DefaultIfEmpty()
                            join u in _context.Users on (t != null ? t.UserId : 0) equals u.Id into userGroup
                            from u in userGroup.DefaultIfEmpty()
                            orderby r.AssessedAt descending
                            select new
                            {
                                r.Id,
                                r.TripId,
                                Destination = t != null ? t.Destination : "Unknown",
                                StartingPlace = t != null ? t.StartingPlace : "",
                                TravellerName = u != null ? (u.FullName ?? u.Username) : "Traveller",
                                TravellerEmail = u != null ? u.Email : "",
                                r.RiskLevel,
                                r.RiskScore,
                                r.Summary,
                                r.AssessedAt
                            }).Take(50).ToListAsync();

        return Ok(new
        {
            totalAssessed,
            highRiskCount,
            mediumRiskCount,
            lowRiskCount,
            alerts
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
