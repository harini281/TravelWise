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
                Status = "PLANNING",
                ApprovalStatus = "PENDING",
                ValidationPassed = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.AIWorkflows.Add(workflow);
            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "WORKFLOW_INITIATED",
                "LangGraph multi-agent planning workflow initiated.",
                "USER"
            );

            var aiResponse = await _aiServiceClient.RunTripWorkflowAsync(tripId, workflow.Id);

            workflow.Status = string.IsNullOrWhiteSpace(aiResponse.WorkflowStatus)
                ? "AWAITING_APPROVAL"
                : aiResponse.WorkflowStatus;

            workflow.ApprovalStatus = string.IsNullOrWhiteSpace(aiResponse.ApprovalStatus)
                ? "PENDING"
                : aiResponse.ApprovalStatus;

            workflow.ValidationPassed = aiResponse.ValidationResults.TryGetValue("passed", out var p) &&
                (p is bool b ? b : p?.ToString()?.ToLower() == "true");

            workflow.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                "AGENTS_EVALUATION_COMPLETED",
                $"Agents completed analysis. Status: {workflow.Status}.",
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
        // HUMAN APPROVAL
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

            if (workflow.Status != "AWAITING_APPROVAL")
            {
                return BadRequest(new
                {
                    message =
                        "Workflow is not awaiting approval."
                });
            }

            var decision = request.Decision
                .Trim()
                .ToUpper();

            if (decision != "APPROVE" &&
                decision != "REJECT" &&
                decision != "REVISE")
            {
                return BadRequest(new
                {
                    message =
                        "Decision must be APPROVE, REJECT, or REVISE."
                });
            }

            workflow.Reviewer = request.Reviewer;
            workflow.ApprovalComment = request.Comment;
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
                workflow.ApprovalStatus = "REVISION_REQUIRED";
                workflow.Status = "REVISION_REQUIRED";
            }

            await _context.SaveChangesAsync();

            await AddAuditLog(
                workflow.Id,
                $"WORKFLOW_{decision}",
                $"Human reviewer selected {decision}.",
                request.Reviewer
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