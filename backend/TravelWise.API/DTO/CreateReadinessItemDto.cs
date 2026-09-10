namespace TravelWise.API.DTOs;

public class CreateReadinessItemDto
{
    public int TripId { get; set; }
    public int TravelRequirementId { get; set; }
    public string Status { get; set; } = "PENDING";
    public string Notes { get; set; } = string.Empty;
}