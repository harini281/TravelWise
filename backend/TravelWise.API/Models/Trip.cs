namespace TravelWise.API.Models;
public class Trip
{
    public int Id { get; set; }

    public string StartingPlace { get; set; } = string.Empty;

    public string Destination { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public DateTime ReturnDate { get; set; }

    public decimal BudgetAmount { get; set; }

    public decimal SpentAmount { get; set; }

    public decimal FoodBudget { get; set; }

    public decimal ReturnBudgetReserve { get; set; }

    public DateTime? OriginalReturnDate { get; set; }

    public string? ReturnTransport { get; set; }

    public int TravellerCount { get; set; }

    public string TripType { get; set; } = string.Empty;

    public string TravelScope { get; set; } = "Local";

    public bool PassportRequired { get; set; }

    public bool TravelInsuranceRequired { get; set; }

    public bool ReadinessChecksComplete { get; set; }

    public string? BaggagePlan { get; set; }

    public string Status { get; set; } = "PLANNING";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Associated User (Traveller)
    public int? UserId { get; set; }

    // Real transport selection & routing telemetry
    public string? SelectedTransport { get; set; }

    public double? EstimatedDistanceKm { get; set; }

    public int? EstimatedDurationMinutes { get; set; }

    public decimal? EstimatedTransportCost { get; set; }

    public double? StartLatitude { get; set; }

    public double? StartLongitude { get; set; }

    public double? DestinationLatitude { get; set; }

    public double? DestinationLongitude { get; set; }

    public string? RouteGeometryJson { get; set; }

    // Trip Completion Telemetry
    public DateTime? CompletedAt { get; set; }

    public string? CompletionMethod { get; set; } // "LOCATION" or "MANUAL"
}