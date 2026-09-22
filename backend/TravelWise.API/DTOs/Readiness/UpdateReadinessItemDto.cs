namespace TravelWise.API.DTOs;

public class UpdateReadinessItemDto
{
    public string Status { get; set; } = "PENDING";
    public string Notes { get; set; } = string.Empty;
}
