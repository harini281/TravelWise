using System.Text.Json.Serialization;

namespace TravelWise.API.DTOs;

public class AIWorkflowRunRequestDto
{
    [JsonPropertyName("workflow_id")]
    public int? WorkflowId { get; set; }

    [JsonPropertyName("trip_id")]
    public int TripId { get; set; }

    [JsonPropertyName("user_id")]
    public int? UserId { get; set; } = 1;

    [JsonPropertyName("trip_context")]
    public object? TripContext { get; set; }

    [JsonPropertyName("traveller_preferences")]
    public List<string> TravellerPreferences { get; set; } = new();

    [JsonPropertyName("budget_context")]
    public object? BudgetContext { get; set; }

    [JsonPropertyName("activity_context")]
    public object? ActivityContext { get; set; }

    [JsonPropertyName("risk_context")]
    public object? RiskContext { get; set; }

    [JsonPropertyName("readiness_context")]
    public object? ReadinessContext { get; set; }

    [JsonPropertyName("requested_capabilities")]
    public List<string> RequestedCapabilities { get; set; } = new()
    {
        "budget",
        "activity",
        "risk",
        "readiness"
    };
}

public class AIWorkflowRunResponseDto
{
    [JsonPropertyName("workflow_id")]
    public int? WorkflowId { get; set; }

    [JsonPropertyName("trip_id")]
    public int TripId { get; set; }

    [JsonPropertyName("workflow_status")]
    public string WorkflowStatus { get; set; } = string.Empty;

    [JsonPropertyName("approval_status")]
    public string ApprovalStatus { get; set; } = string.Empty;

    [JsonPropertyName("agent_tasks")]
    public List<object> AgentTasks { get; set; } = new();

    [JsonPropertyName("agent_results")]
    public Dictionary<string, object> AgentResults { get; set; } = new();

    [JsonPropertyName("validation_results")]
    public Dictionary<string, object> ValidationResults { get; set; } = new();

    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = new();
}
