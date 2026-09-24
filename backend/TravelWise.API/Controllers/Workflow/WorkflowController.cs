using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.API.Data;
using TravelWise.API.DTOs;
using TravelWise.API.Models;
using TravelWise.API.Services;

namespace TravelWise.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkflowController : ControllerBase
    {
        private readonly TravelWiseDbContext _context;
        private readonly AIServiceClient _aiServiceClient;

        public WorkflowController(
            TravelWiseDbContext context,
            AIServiceClient aiServiceClient)
        {
            _context = context;
            _aiServiceClient = aiServiceClient;
        }

        // -------------------------------------------------
        // RUN AI WORKFLOW FOR TRIP
        // POST /api/Workflow/trip/{tripId}/run
        // -------------------------------------------------

        [HttpPost("trip/{tripId}/run")]
        public async Task<IActionResult> RunTripWorkflow(int tripId)
        {
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == tripId);

            if (!tripExists)
            {
                return NotFound(new
                {
                    message = $"Trip with ID {tripId} was not found."
                });
            }

            var workflow = new AIWorkflow
            {
                TripId = tripId,
                Status = "AI_GENERATED",
                ApprovalStatus = "PENDING",
                ValidationPassed = false,
                TravellerDecision = null,
                TravellerComment = null,
                TravellerDecisionAt = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AIWorkflows.Add(workflow);
            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "WORKFLOW_INITIATED",
                "LangGraph multi-agent planning workflow initiated.",
                User.Identity?.Name ?? "TRAVELLER"
            );

            var aiResponse = await _aiServiceClient.RunTripWorkflowAsync(tripId, workflow.Id);

            workflow.ValidationPassed = aiResponse.ValidationResults.TryGetValue("passed", out var p) &&
                (p is bool b ? b : p?.ToString()?.ToLower() == "true");

            if (aiResponse.WorkflowStatus == "SAFE_FAILURE")
            {
                workflow.Status = "SAFE_FAILURE";
            }
            else if (workflow.ValidationPassed)
            {
                workflow.Status = "AWAITING_TRAVELLER_REVIEW";
            }
            else
            {
                workflow.Status = "VALIDATION_FAILED";
            }

            workflow.ApprovalStatus = "PENDING";
            workflow.PlanDataJson = JsonSerializer.Serialize(aiResponse.AgentResults);
            workflow.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "AGENTS_EVALUATION_COMPLETED",
                $"Agents completed analysis. Invariants: {(workflow.ValidationPassed ? "PASSED" : "FAILED")}. Status: {workflow.Status}.",
                "AI_SERVICE"
            );

            return Ok(new
            {
                Workflow = workflow,
                AIResult = aiResponse
            });
        }

        // -------------------------------------------------
        // CREATE WORKFLOW
        // POST /api/Workflow
        // -------------------------------------------------

        [HttpPost]
        public async Task<IActionResult> CreateWorkflow(
            [FromBody] CreateWorkflowRequest request)
        {
            var tripExists = await _context.Trips
                .AnyAsync(t => t.Id == request.TripId);

            if (!tripExists)
            {
                return NotFound(new
                {
                    message = "Trip not found."
                });
            }

            var workflow = new AIWorkflow
            {
                TripId = request.TripId,
                Status = "CREATED",
                ApprovalStatus = "PENDING",
                ValidationPassed = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AIWorkflows.Add(workflow);
            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "WORKFLOW_CREATED",
                "AI workflow created.",
                "SYSTEM"
            );

            return Ok(workflow);
        }


        // -------------------------------------------------
        // GET WORKFLOW
        // GET /api/Workflow/{id}
        // -------------------------------------------------

        [HttpGet("{id}")]
        public async Task<IActionResult> GetWorkflow(int id)
        {
            var workflow = await _context.AIWorkflows
                .Where(w => w.Id == id)
                .Select(w => new
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
                    w.PlanDataJson,
                    w.CreatedAt,
                    w.UpdatedAt,

                    AuditLogs = _context.WorkflowAuditLogs
                        .Where(a => a.AIWorkflowId == w.Id)
                        .OrderBy(a => a.CreatedAt)
                        .Select(a => new
                        {
                            a.Id,
                            a.EventType,
                            a.Message,
                            a.Actor,
                            a.CreatedAt
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (workflow == null)
            {
                return NotFound(new
                {
                    message = "Workflow not found."
                });
            }

            return Ok(workflow);
        }


        // -------------------------------------------------
        // GET WORKFLOWS FOR TRIP
        // GET /api/Workflow/trip/{tripId}
        // -------------------------------------------------

        [HttpGet("trip/{tripId}")]
        public async Task<IActionResult> GetTripWorkflows(int tripId)
        {
            var workflows = await _context.AIWorkflows
                .Where(w => w.TripId == tripId)
                .OrderByDescending(w => w.CreatedAt)
                .ToListAsync();

            return Ok(workflows);
        }


        // -------------------------------------------------
        // GET LATEST WORKFLOW FOR TRIP
        // GET /api/Workflow/trip/{tripId}/latest
        // -------------------------------------------------

        [HttpGet("trip/{tripId}/latest")]
        public async Task<IActionResult> GetLatestTripWorkflow(int tripId)
        {
            var workflow = await _context.AIWorkflows
                .Where(w => w.TripId == tripId)
                .OrderByDescending(w => w.CreatedAt)
                .Select(w => new
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
                    w.PlanDataJson,
                    w.CreatedAt,
                    w.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (workflow == null)
            {
                return NotFound(new { message = "No workflow found for this trip." });
            }

            return Ok(workflow);
        }

        // -------------------------------------------------
        // UPDATE WORKFLOW STATUS
        // PUT /api/Workflow/{id}/status
        // -------------------------------------------------

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody] UpdateWorkflowStatusRequest request)
        {
            var workflow = await _context.AIWorkflows
                .FindAsync(id);

            if (workflow == null)
            {
                return NotFound(new
                {
                    message = "Workflow not found."
                });
            }

            workflow.Status = request.Status.Trim().ToUpper();
            workflow.ValidationPassed = request.ValidationPassed;
            workflow.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "STATUS_UPDATED",
                $"Workflow status changed to {workflow.Status}.",
                "AI_SERVICE"
            );

            return Ok(workflow);
        }


        // -------------------------------------------------
        // TRAVELLER DECISION (HITL Phase 1)
        // POST /api/Workflow/{id}/traveller-decision
        // -------------------------------------------------

        [Authorize]
        [HttpPost("{id}/traveller-decision")]
        public async Task<IActionResult> SubmitTravellerDecision(
            int id,
            [FromBody] TravellerWorkflowDecisionRequest request)
        {
            var workflow = await _context.AIWorkflows
                .Include(w => w.Trip)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workflow == null)
            {
                return NotFound(new { message = "Workflow not found." });
            }

            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";
            var isTripOwner = int.TryParse(userIdClaim, out var currentUserId) && workflow.Trip != null && workflow.Trip.UserId == currentUserId;
            var isPrivileged = userRole == "Admin" || userRole == "Reviewer";

            if (!isTripOwner && !isPrivileged)
            {
                return StatusCode(403, new { message = "Access restricted: You may only review AI plans for your own trips." });
            }

            var decision = (request.Decision ?? "").Trim().ToUpper();
            if (decision != "ACCEPT" &&
                decision != "APPROVE" &&
                decision != "REQUEST_CHANGES" &&
                decision != "REQUEST CHANGES" &&
                decision != "REVISE" &&
                decision != "REJECT")
            {
                return BadRequest(new { message = "Decision must be ACCEPT, REQUEST_CHANGES, or REJECT." });
            }

            var comment = (request.Comment ?? "").Trim();
            if ((decision == "REQUEST_CHANGES" || decision == "REQUEST CHANGES" || decision == "REVISE") && string.IsNullOrWhiteSpace(comment))
            {
                return BadRequest(new { message = "A comment is required when requesting revisions." });
            }

            if (decision == "REJECT" && string.IsNullOrWhiteSpace(comment))
            {
                return BadRequest(new { message = "A reason is required when rejecting a plan." });
            }

            var travellerIdentifier = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "Traveller";

            workflow.TravellerComment = string.IsNullOrWhiteSpace(comment) ? null : comment;
            workflow.TravellerDecisionAt = DateTime.UtcNow;
            workflow.UpdatedAt = DateTime.UtcNow;

            if (decision == "ACCEPT" || decision == "APPROVE")
            {
                workflow.TravellerDecision = "ACCEPTED";
                workflow.Status = "AWAITING_ADMIN_REVIEW";
                workflow.ApprovalStatus = "PENDING";

                await AddAuditLog(
                    workflow.Id,
                    "TRAVELLER_ACCEPTED",
                    $"Traveller accepted AI plan. Submitted for Admin review. {(string.IsNullOrWhiteSpace(comment) ? "" : $"Note: {comment}")}".Trim(),
                    travellerIdentifier
                );
            }
            else if (decision == "REJECT")
            {
                workflow.TravellerDecision = "REJECTED";
                workflow.Status = "TRAVELLER_REJECTED";
                workflow.ApprovalStatus = "REJECTED";

                await AddAuditLog(
                    workflow.Id,
                    "TRAVELLER_REJECTED",
                    $"Traveller rejected AI plan. Reason: {comment}",
                    travellerIdentifier
                );
            }
            else
            {
                workflow.TravellerDecision = "CHANGES_REQUESTED";
                workflow.Status = "TRAVELLER_CHANGES_REQUESTED";
                workflow.ApprovalStatus = "CHANGES_REQUESTED";

                await AddAuditLog(
                    workflow.Id,
                    "TRAVELLER_CHANGES_REQUESTED",
                    $"Traveller requested plan revisions: {comment}",
                    travellerIdentifier
                );
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Traveller decision recorded: {workflow.TravellerDecision}",
                workflow
            });
        }

        // -------------------------------------------------
        // HUMAN APPROVAL (HITL Phase 2 - Admin / Reviewer)
        // POST /api/Workflow/{id}/approval
        // -------------------------------------------------

        [Authorize(Roles = "Reviewer,Admin")]
        [HttpPost("{id}/approval")]
        public async Task<IActionResult> ProcessApproval(
            int id,
            [FromBody] WorkflowApprovalRequest request)
        {
            var workflow = await _context.AIWorkflows
                .FindAsync(id);

            if (workflow == null)
            {
                return NotFound(new
                {
                    message = "Workflow not found."
                });
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

            if (decision != "APPROVE" &&
                decision != "REJECT" &&
                decision != "REQUEST_CHANGES" &&
                decision != "REQUEST CHANGES" &&
                decision != "REVISE")
            {
                return BadRequest(new
                {
                    message = "Decision must be APPROVE, REQUEST_CHANGES, or REJECT."
                });
            }

            var comment = (request.Comment ?? "").Trim();
            if ((decision == "REQUEST_CHANGES" || decision == "REQUEST CHANGES" || decision == "REVISE") && string.IsNullOrWhiteSpace(comment))
            {
                return BadRequest(new
                {
                    message = "A comment is required when requesting changes."
                });
            }

            if (decision == "REJECT" && string.IsNullOrWhiteSpace(comment))
            {
                return BadRequest(new
                {
                    message = "A reason/comment is required when rejecting a plan."
                });
            }

            var reviewerIdentifier = !string.IsNullOrWhiteSpace(request.Reviewer)
                ? request.Reviewer
                : User.Identity?.Name ?? "Reviewer";

            workflow.Reviewer = reviewerIdentifier;
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

            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                $"WORKFLOW_{decision.Replace(" ", "_")}",
                $"Reviewer decision: {decision}. Note: {(string.IsNullOrWhiteSpace(comment) ? "None" : comment)}",
                reviewerIdentifier
            );

            return Ok(workflow);
        }


        // -------------------------------------------------
        // MANUAL AUDIT EVENT
        // POST /api/Workflow/{id}/audit
        // -------------------------------------------------

        [HttpPost("{id}/audit")]
        public async Task<IActionResult> AddAudit(
            int id,
            [FromBody] CreateAuditLogRequest request)
        {
            var exists = await _context.AIWorkflows
                .AnyAsync(w => w.Id == id);

            if (!exists)
            {
                return NotFound(new
                {
                    message = "Workflow not found."
                });
            }

            var audit = await AddAuditLog(
                id,
                request.EventType,
                request.Message,
                request.Actor
            );

            return Ok(audit);
        }


        // -------------------------------------------------
        // PRIVATE AUDIT HELPER
        // -------------------------------------------------

        private async Task<WorkflowAuditLog> AddAuditLog(
            int workflowId,
            string eventType,
            string message,
            string? actor)
        {
            var audit = new WorkflowAuditLog
            {
                AIWorkflowId = workflowId,
                EventType = eventType,
                Message = message,
                Actor = actor,
                CreatedAt = DateTime.UtcNow
            };

            _context.WorkflowAuditLogs.Add(audit);
            await _context.SaveChangesAsync();

            return audit;
        }
    }


    // -----------------------------------------------------
    // REQUEST DTOs
    // -----------------------------------------------------

    public class CreateWorkflowRequest
    {
        public int TripId { get; set; }
    }


    public class UpdateWorkflowStatusRequest
    {
        public string Status { get; set; } = string.Empty;

        public bool ValidationPassed { get; set; }
    }


    public class TravellerWorkflowDecisionRequest
    {
        public string Decision { get; set; } = string.Empty; // "ACCEPT", "REQUEST_CHANGES", "REJECT"

        public string? Comment { get; set; }
    }


    public class WorkflowApprovalRequest
    {
        public string Decision { get; set; } = string.Empty;

        public string Reviewer { get; set; } = string.Empty;

        public string? Comment { get; set; }
    }


    public class CreateAuditLogRequest
    {
        public string EventType { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string? Actor { get; set; }
    }
}