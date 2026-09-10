namespace TravelWise.API.DTOs;

public class CreateTravelRequirementDto
{
    public int TripId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsRequired { get; set; } = true;
    public DateTime? Deadline { get; set; }
}