using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using TravelWise.API.DTO;

namespace TravelWise.API.Integrations.Geoapify;

public sealed class GeoapifyService(HttpClient client, GeoapifyOptions options,
    GeoapifyRequestBudget budget, IMemoryCache cache) : IGeoapifyService
{
    public async Task<AccommodationDestination[]> Autocomplete(string query, CancellationToken cancellationToken)
    {
        using var json = await Request("v1/geocode/autocomplete?type=locality&format=json&limit=8&lang=en&text="
            + Uri.EscapeDataString(query), 1, cancellationToken);
        var results = RequiredArray(json.RootElement, "results");
        return results.EnumerateArray().Select(p =>
        {
            var id = Text(p, "place_id");
            var displayName = Text(p, "formatted");
            return id is not null && displayName is not null && Coordinates(p, out var lat, out var lon)
                ? new AccommodationDestination(id, displayName, Text(p, "city"), Text(p, "country"), lat, lon) : null;
        }).OfType<AccommodationDestination>().DistinctBy(p => p.ProviderId).ToArray();
    }

    public async Task<AccommodationResults> Search(AccommodationSearchRequest request, CancellationToken cancellationToken)
    {
        var destination = request.Destination!;
        var lat = (request.CenterLatitude ?? destination.Latitude).ToString("R", CultureInfo.InvariantCulture);
        var lon = (request.CenterLongitude ?? destination.Longitude).ToString("R", CultureInfo.InvariantCulture);
        var radius = Math.Clamp(request.RadiusMeters ?? 10000, 500, 50000);

        var categoryFilter = "accommodation";
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var clean = request.Category.Trim().ToLowerInvariant().Replace(' ', '_');
            if (clean is "hotel" or "motel" or "hostel" or "guest_house" or "apartment" or "resort" or "chalet")
                categoryFilter = $"accommodation.{clean}";
        }

        var path = $"v2/places?categories={categoryFilter}&filter=circle:{lon},{lat},{radius}&bias=proximity:{lon},{lat}&limit=20&offset={request.Offset}&lang=en";
        // This is place discovery; dates/guests do not imply availability or enter the cache key.
        var cacheKey = "accommodation:" + path;
        if (cache.TryGetValue(cacheKey, out AccommodationResults? cached)) return cached!;
        using var json = await Request(path, 1, cancellationToken);
        var features = RequiredArray(json.RootElement, "features");
        var rawList = features.EnumerateArray().Select(ReadProperty).ToList();
        var properties = rawList.OfType<AccommodationProperty>()
            .DistinctBy(p => p.ProviderId).ToArray();
        var result = new AccommodationResults(properties,
            features.GetArrayLength() == 20 && request.Offset < 180 ? request.Offset + 20 : null);
        // Geoapify explicitly permits Places result caching with attribution.
        cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));
        return result;
    }

    public async Task<AccommodationProperty?> Details(string providerId, CancellationToken cancellationToken)
    {
        using var json = await Request("v2/place-details?features=details&lang=en&id="
            + Uri.EscapeDataString(providerId), 2, cancellationToken);
        return RequiredArray(json.RootElement, "features").EnumerateArray().Select(ReadProperty)
            .FirstOrDefault(p => p?.ProviderId == providerId);
    }

    public async Task<NearbyPoiResults> Nearby(double latitude, double longitude, string? category, int? radiusMeters, CancellationToken cancellationToken)
    {
        var (categoryKey, geoapifyCategories) = ResolveNearbyCategory(category);
        var radius = Math.Clamp(radiusMeters ?? 2500, 200, 10000);
        var lat = latitude.ToString("R", CultureInfo.InvariantCulture);
        var lon = longitude.ToString("R", CultureInfo.InvariantCulture);

        var path = $"v2/places?categories={geoapifyCategories}&filter=circle:{lon},{lat},{radius}&bias=proximity:{lon},{lat}&limit=20&lang=en";
        var cacheKey = "nearby:" + path;
        if (cache.TryGetValue(cacheKey, out NearbyPoiResults? cached)) return cached!;

        using var json = await Request(path, 1, cancellationToken);
        var features = RequiredArray(json.RootElement, "features");
        var places = features.EnumerateArray().Select(f => ReadNearbyPoi(f, categoryKey)).OfType<NearbyPoi>()
            .DistinctBy(p => p.ProviderId).ToArray();

        var result = new NearbyPoiResults(places, categoryKey);
        cache.Set(cacheKey, result, TimeSpan.FromMinutes(10));
        return result;
    }

    public static (string NormalizedCategory, string ProviderCategories) ResolveNearbyCategory(string? category)
    {
        return category?.Trim().ToLowerInvariant() switch
        {
            "cafes" or "cafe" => ("cafes", "catering.cafe"),
            "attractions" or "sights" => ("attractions", "tourism.sights,tourism.attraction,entertainment"),
            "transport" or "transit" => ("transport", "public_transport"),
            "healthcare" or "hospital" => ("healthcare", "healthcare.hospital,healthcare.pharmacy"),
            "shopping" => ("shopping", "commercial.shopping_mall,commercial.supermarket"),
            _ => ("restaurants", "catering.restaurant")
        };
    }

    private static NearbyPoi? ReadNearbyPoi(JsonElement feature, string defaultCategory)
    {
        if (feature.ValueKind != JsonValueKind.Object || !feature.TryGetProperty("properties", out var p)
            || p.ValueKind != JsonValueKind.Object || !Coordinates(p, out var lat, out var lon)) return null;

        var id = Text(p, "place_id");
        if (id is null) return null;

        string? subCategory = null;
        if (p.TryGetProperty("categories", out var categories) && categories.ValueKind == JsonValueKind.Array)
        {
            subCategory = categories.EnumerateArray()
                .Where(c => c.ValueKind == JsonValueKind.String)
                .Select(c => c.GetString()!)
                .FirstOrDefault(c => c.Contains('.'))?
                .Split('.').Last().Replace('_', ' ');
        }

        var distance = Number(p, "distance");
        var address = Text(p, "formatted") ?? Text(p, "address_line2") ?? Text(p, "street");
        return new NearbyPoi(id, Text(p, "name"), defaultCategory, subCategory, address, lat, lon,
            distance >= 0 ? distance : null);
    }

    private async Task<JsonDocument> Request(string path, int cost, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
            throw new AccommodationProviderException(503, "Accommodation discovery is not configured yet. Please try again later.");
        cancellationToken.ThrowIfCancellationRequested();
        budget.Reserve(cost);
        try
        {
            using var response = await client.GetAsync(path + "&apiKey=" + Uri.EscapeDataString(options.ApiKey), cancellationToken);
            if ((int)response.StatusCode == 429)
                throw new AccommodationProviderException(429, "The accommodation provider is busy. Please try again later.");
            if (!response.IsSuccessStatusCode)
                throw new AccommodationProviderException(503, "Accommodation discovery is temporarily unavailable. Please try again.");
            return JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException || ex is OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            // Never return/log upstream exception bodies or URLs: the provider key is in its query string.
            throw new AccommodationProviderException(503, "Accommodation discovery could not be reached. Please try again.");
        }
    }

    private static JsonElement RequiredArray(JsonElement root, string key) =>
        root.ValueKind == JsonValueKind.Object && root.TryGetProperty(key, out var array) && array.ValueKind == JsonValueKind.Array
            ? array : throw new AccommodationProviderException(503, "The accommodation provider returned an unreadable response. Please try again.");

    private static AccommodationProperty? ReadProperty(JsonElement feature)
    {
        if (feature.ValueKind != JsonValueKind.Object) return null;
        if (!feature.TryGetProperty("properties", out var p)) return null;
        if (p.ValueKind != JsonValueKind.Object) return null;
        if (!Coordinates(p, out var lat, out var lon)) return null;
        var id = Text(p, "place_id");
        if (id is null) return null;
        if (!p.TryGetProperty("categories", out var categories)) return null;
        if (categories.ValueKind != JsonValueKind.Array) return null;
        var types = categories.EnumerateArray().Where(c => c.ValueKind == JsonValueKind.String)
            .Select(c => c.GetString()!).Where(c => c == "accommodation" || c.StartsWith("accommodation.", StringComparison.Ordinal)).ToArray();
        if (types.Length == 0) return null;
        var type = types.FirstOrDefault(c => c.StartsWith("accommodation.", StringComparison.Ordinal))?["accommodation.".Length..].Replace('_', ' ');
        var distance = Number(p, "distance");
        return new AccommodationProperty(id, Text(p, "name"), type, Text(p, "formatted"), lat, lon,
            distance >= 0 ? distance : null, Text(p, "description"),
            ExtractAmenities(p), Text(p, "website"), Text(p, "phone"),
            Text(p, "city"), Text(p, "country"), Text(p, "postcode"));
    }

    private static string[]? ExtractAmenities(JsonElement p)
    {
        var list = new List<string>();
        if (p.TryGetProperty("facilities", out var facilities) && facilities.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in facilities.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.True || (prop.Value.ValueKind == JsonValueKind.String && prop.Value.GetString() == "yes"))
                    list.Add(prop.Name.Replace('_', ' '));
            }
        }
        if (p.TryGetProperty("catering", out var catering) && catering.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in catering.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.True || (prop.Value.ValueKind == JsonValueKind.String && prop.Value.GetString() == "yes"))
                    list.Add(prop.Name.Replace('_', ' '));
            }
        }
        return list.Count > 0 ? list.Distinct(StringComparer.OrdinalIgnoreCase).ToArray() : null;
    }

    private static bool Coordinates(JsonElement p, out double lat, out double lon)
    {
        var latitude = Number(p, "lat"); var longitude = Number(p, "lon");
        lat = latitude ?? 0; lon = longitude ?? 0;
        return latitude.HasValue && longitude.HasValue && Math.Abs(lat) <= 90 && Math.Abs(lon) <= 180;
    }
    private static double? Number(JsonElement p, string key) => p.ValueKind == JsonValueKind.Object
        && p.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number
        && value.TryGetDouble(out var number) && double.IsFinite(number) ? number : null;
    private static string? Text(JsonElement p, string key) => p.ValueKind == JsonValueKind.Object
        && p.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String
        && !string.IsNullOrWhiteSpace(value.GetString()) ? value.GetString() : null;
}
