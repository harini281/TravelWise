using System.ComponentModel.DataAnnotations;

namespace TravelWise.API.DTO;

public record AccommodationDestination(string ProviderId, string DisplayName, string? City,
    string? Country, double Latitude, double Longitude);

// Discovery only: intentionally no price, inventory, guest rating or booking status fields.
public record AccommodationProperty(string ProviderId, string? Name, string? Type, string? Address,
    double Latitude, double Longitude, double? DistanceMeters, string? Description);

public record AccommodationResults(AccommodationProperty[] Properties, int? NextOffset,
    string Notice = "Availability and live pricing not checked");

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
    }
}
