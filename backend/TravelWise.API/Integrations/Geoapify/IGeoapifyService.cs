using TravelWise.API.DTO;

namespace TravelWise.API.Integrations.Geoapify;

public interface IGeoapifyService
{
    Task<AccommodationDestination[]> Autocomplete(string query, CancellationToken cancellationToken);
    Task<AccommodationResults> Search(AccommodationSearchRequest request, CancellationToken cancellationToken);
    Task<AccommodationProperty?> Details(string providerId, CancellationToken cancellationToken);
    Task<NearbyPoiResults> Nearby(double latitude, double longitude, string? category, int? radiusMeters, CancellationToken cancellationToken);
}
