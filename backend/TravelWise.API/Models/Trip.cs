namespace TravelWise.API.Models;
public class Trip
{
    public int Id { get; set; }

    public string StartingPlace { get; set; } = string.Empty;

    public string Destination { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime ReturnDate { get; set; }

    public decimal BudgetAmount { get; set; }

    public int TravellerCount { get; set; }

    public string TripType { get; set; } = string.Empty;

    public string Status { get; set; } = "PLANNING";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}