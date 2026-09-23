using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTO;

public record AccommodationDestination(string ProviderId, string DisplayName, string? City,
    string? Country, double Latitude, double Longitude);

// Discovery only: intentionally no price, inventory, guest rating or booking status fields.
public record AccommodationProperty(string ProviderId, string? Name, string? Type, string? Address,
    double Latitude, double Longitude, double? DistanceMeters, string? Description,
    string[]? Amenities = null, string? Website = null, string? Phone = null,
    string? City = null, string? Country = null, string? Postcode = null, string? ImageUrl = null);

public record AccommodationResults(AccommodationProperty[] Properties, int? NextOffset,
    string Notice = "Availability and live pricing not checked");

public record NearbyPoi(string ProviderId, string? Name, string Category, string? SubCategory,
    string? Address, double Latitude, double Longitude, double? DistanceMeters);

public record NearbyPoiResults(NearbyPoi[] Places, string Category);

public class AccommodationSearchRequest : IValidatableObject
{
    [Required] public AccommodationDestination? Destination { get; set; }
    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    [Range(1, 30)] public int Adults { get; set; } = 1;
    [Range(0, 30)] public int Children { get; set; }
    [Range(1, 30)] public int Rooms { get; set; } = 1;
    [Range(-840, 840)] public int ClientUtcOffsetMinutes { get; set; }
    [Range(0, 180)] public int Offset { get; set; }
    public double? CenterLatitude { get; set; }
    public double? CenterLongitude { get; set; }
    [Range(500, 50000)] public int? RadiusMeters { get; set; }
    public string? Category { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Destination is null || string.IsNullOrWhiteSpace(Destination.ProviderId)
            || Destination.ProviderId.Length > 512 || string.IsNullOrWhiteSpace(Destination.DisplayName)
            || Destination.DisplayName.Length > 500 || !double.IsFinite(Destination.Latitude)
            || !double.IsFinite(Destination.Longitude) || Math.Abs(Destination.Latitude) > 90
            || Math.Abs(Destination.Longitude) > 180)
            yield return new ValidationResult("Select a destination from the suggestions.", [nameof(Destination)]);
        // JS getTimezoneOffset has the opposite sign to the local UTC offset.
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddMinutes(-Math.Clamp(ClientUtcOffsetMinutes, -840, 840)));
        if (CheckIn < today)
            yield return new ValidationResult("Check-in must be today or later.", [nameof(CheckIn)]);
        if (CheckOut <= CheckIn)
            yield return new ValidationResult("Check-out must be after check-in.", [nameof(CheckOut)]);
        if (Offset % 20 != 0)
            yield return new ValidationResult("Invalid result page.", [nameof(Offset)]);
        if (CenterLatitude.HasValue && (!double.IsFinite(CenterLatitude.Value) || Math.Abs(CenterLatitude.Value) > 90))
            yield return new ValidationResult("Center latitude must be between -90 and 90.", [nameof(CenterLatitude)]);
        if (CenterLongitude.HasValue && (!double.IsFinite(CenterLongitude.Value) || Math.Abs(CenterLongitude.Value) > 180))
            yield return new ValidationResult("Center longitude must be between -180 and 180.", [nameof(CenterLongitude)]);
    }
}
