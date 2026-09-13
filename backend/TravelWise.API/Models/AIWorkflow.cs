namespace TravelWise.API.Models
{
    public class AIWorkflow
    {
        public int Id { get; set; }

        public int TripId { get; set; }

        public string Status { get; set; } = "CREATED";

        public string ApprovalStatus { get; set; } = "PENDING";

        public bool ValidationPassed { get; set; }

        public string? Reviewer { get; set; }

        public string? ApprovalComment { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Trip? Trip { get; set; }
    }
}