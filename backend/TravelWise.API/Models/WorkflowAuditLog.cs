namespace TravelWise.API.Models
{
    public class WorkflowAuditLog
    {
        public int Id { get; set; }

        public int AIWorkflowId { get; set; }

        public string EventType { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public string? Actor { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public AIWorkflow? AIWorkflow { get; set; }
    }
}