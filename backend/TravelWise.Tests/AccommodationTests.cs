using System.ComponentModel.DataAnnotations;
using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using TravelWise.API.Controllers;
using TravelWise.API.DTO;
using TravelWise.API.Services;

namespace TravelWise.Tests;

// Upstream fixtures exist only in tests, never as application fallback inventory.
public class AccommodationTests
{
    private const string Key = "test-only-provider-secret";
    private const string Properties = """
        {"features":[{"properties":{"place_id":"test-property","name":"Provider property","categories":["accommodation.hotel"],"formatted":"Provider address","lat":0,"lon":0,"distance":1250}},
        {"properties":{"place_id":"not-a-hotel","categories":["catering.restaurant"],"lat":1,"lon":1}},
        {"properties":{"place_id":"bad-coordinates","categories":["accommodation.hotel"],"lat":999,"lon":1}}]}
        """;

    private sealed class Handler(string content = Properties, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
    {
        public List<Uri> Requests { get; } = [];
        public bool FailNetwork { get; init; }
        public bool Timeout { get; init; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Requests.Add(request.RequestUri!);
            if (FailNetwork) throw new HttpRequestException("secret upstream URL " + Key);
            if (Timeout) throw new TaskCanceledException("provider timeout " + Key);
            return Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(content) });
        }
    }

    private static GeoapifyService Provider(Handler handler, string? key = Key) => new(
        new HttpClient(handler) { BaseAddress = new Uri("https://api.geoapify.com/") }, new GeoapifyOptions(key),
        new GeoapifyRequestBudget(), new MemoryCache(new MemoryCacheOptions()));
    private static AccommodationSearchRequest Valid() => new()
    {
        Destination = new("selected-place", "Quito, Ecuador", "Quito", "Ecuador", 0, 0),
        CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)), CheckOut = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3))
    };
    private static bool Validate(AccommodationSearchRequest request) => Validator.TryValidateObject(request,
        new ValidationContext(request), new List<ValidationResult>(), true);

    [Fact]
    public async Task AutocompletePreservesWorldwideChoicesAndDoesNotApplyCountryFilter()
    {
        var handler = new Handler("""
            {"results":[{"place_id":"paris-fr","formatted":"Paris, France","city":"Paris","country":"France","lat":48.85,"lon":2.35},
            {"place_id":"paris-us","formatted":"Paris, Texas, United States","city":"Paris","country":"United States","lat":33.66,"lon":-95.55},
            {"place_id":"tokyo-jp","formatted":"東京, Japan","city":"東京","country":"Japan","lat":35.68,"lon":139.69}]}
            """);
        var results = await Provider(handler).Autocomplete("Paris & 東京", default);
        Assert.Equal(3, results.Length);
        Assert.Equal("United States", results[1].Country);
        Assert.Equal("東京", results[2].City);
        Assert.Equal(-95.55, results[1].Longitude);
        Assert.DoesNotContain("countrycode", handler.Requests.Single().Query);
        Assert.Contains("Paris%20%26", handler.Requests.Single().AbsoluteUri);
        Assert.DoesNotContain(Key, JsonSerializer.Serialize(results));
    }

    [Fact]
    public async Task DiscoveryUsesCoordinatesFiltersNonAccommodationAndCachesPlaceDataOnly()
    {
        var handler = new Handler(); var provider = Provider(handler); var request = Valid();
        var result = await provider.Search(request, default);
        var property = Assert.Single(result.Properties);
        Assert.Equal(0, property.Latitude); Assert.Equal(0, property.Longitude);
        Assert.Equal(1250, property.DistanceMeters); Assert.Equal("hotel", property.Type);
        Assert.Equal("Availability and live pricing not checked", result.Notice);
        var json = JsonSerializer.SerializeToElement(property);
        Assert.False(json.TryGetProperty("Price", out _)); Assert.False(json.TryGetProperty("Rating", out _));
        Assert.Contains("filter=circle:0,0,10000", handler.Requests.Single().Query);
        request.CheckOut = request.CheckOut.AddDays(1);
        await provider.Search(request, default);
        Assert.Single(handler.Requests);
        Assert.DoesNotContain("check", handler.Requests[0].Query);
    }

    [Fact]
    public async Task EmptyResultsAndMissingOptionalFieldsAreNotFabricated()
    {
        var empty = await Provider(new Handler("{\"features\":[]}")).Search(Valid(), default);
        Assert.Empty(empty.Properties); Assert.Null(empty.NextOffset);
        var result = await Provider(new Handler("""
            {"features":[{"properties":{"place_id":"minimal","categories":["accommodation"],"lat":-33.8,"lon":151.2}}]}
            """)).Search(Valid(), default);
        var property = Assert.Single(result.Properties);
        Assert.Null(property.Name); Assert.Null(property.Type); Assert.Null(property.DistanceMeters); Assert.Null(property.Description);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("{}")]
    [InlineData("{\"features\":null}")]
    public async Task MalformedResponsesAreErrorsNotEmptySuccess(string body)
    {
        var controller = new AccommodationsController(Provider(new Handler(body)));
        Assert.Equal(503, Assert.IsType<ObjectResult>(await controller.Search(Valid(), default)).StatusCode);
    }

    [Theory]
    [InlineData(401, 503)] [InlineData(500, 503)] [InlineData(429, 429)]
    public async Task UpstreamErrorsStaySafe(int upstream, int expected)
    {
        var controller = new AccommodationsController(Provider(new Handler(Key, (HttpStatusCode)upstream)));
        var result = Assert.IsType<ObjectResult>(await controller.Search(Valid(), default));
        Assert.Equal(expected, result.StatusCode); Assert.DoesNotContain(Key, JsonSerializer.Serialize(result.Value));
    }

    [Theory]
    [InlineData(true)] [InlineData(false)]
    public async Task NetworkAndTimeoutErrorsAreSafe(bool network)
    {
        var controller = new AccommodationsController(Provider(new Handler { FailNetwork = network, Timeout = !network }));
        var result = Assert.IsType<ObjectResult>(await controller.Search(Valid(), default));
        Assert.Equal(503, result.StatusCode); Assert.DoesNotContain(Key, JsonSerializer.Serialize(result.Value));
    }

    [Fact]
    public async Task MissingKeyAndCancellationMakeNoProviderRequest()
    {
        var handler = new Handler();
        var result = await new AccommodationsController(Provider(handler, null)).Search(Valid(), default);
        Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode); Assert.Empty(handler.Requests);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Provider(handler).Search(Valid(), new CancellationToken(true)));
        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task DetailsUseProviderIdAndCannotReturnRestaurantAsHotel()
    {
        var handler = new Handler(); var provider = Provider(handler);
        Assert.NotNull(await provider.Details("test-property", default));
        Assert.Contains("features=details", handler.Requests[0].Query);
        Assert.Null(await provider.Details("not-a-hotel", default));
    }

    [Fact]
    public void SearchValidatesDatesGuestsSelectionCoordinatesAndPages()
    {
        Assert.True(Validate(Valid()));
        Action<AccommodationSearchRequest>[] invalid = [r => r.Destination = null,
            r => r.Destination = r.Destination! with { ProviderId = "" },
            r => r.Destination = r.Destination! with { Latitude = double.NaN },
            r => r.Destination = r.Destination! with { Longitude = 181 },
            r => r.CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-2)),
            r => r.CheckOut = r.CheckIn, r => r.Adults = 0, r => r.Children = -1, r => r.Rooms = 0,
            r => r.Offset = 1, r => r.Offset = 200];
        foreach (var change in invalid) { var request = Valid(); change(request); Assert.False(Validate(request)); }
    }

    [Fact]
    public void LocalDateValidationHonoursTravellerTimezone()
    {
        foreach (var offset in new[] { -840, 720 })
        {
            var request = Valid(); request.ClientUtcOffsetMinutes = offset;
            request.CheckIn = DateOnly.FromDateTime(DateTime.UtcNow.AddMinutes(-offset));
            request.CheckOut = request.CheckIn.AddDays(1); Assert.True(Validate(request));
            request.CheckIn = request.CheckIn.AddDays(-1); Assert.False(Validate(request));
        }
    }

    [Fact]
    public void ProviderBudgetAndAuthenticationAreRequired()
    {
        Assert.NotEmpty(typeof(AccommodationsController).GetCustomAttributes(typeof(AuthorizeAttribute), true));
        var budget = new GeoapifyRequestBudget(); budget.Reserve(2800);
        Assert.Throws<AccommodationProviderException>(() => budget.Reserve(1));
    }

    [Fact]
    public async Task SearchThisAreaUsesCustomCoordinatesAndRadius()
    {
        var handler = new Handler();
        var provider = Provider(handler);
        var request = Valid();
        request.CenterLatitude = 48.86;
        request.CenterLongitude = 2.34;
        request.RadiusMeters = 5000;
        request.Category = "hostel";

        var result = await provider.Search(request, default);
        Assert.Single(handler.Requests);
        var query = handler.Requests[0].Query;
        Assert.Contains("filter=circle:2.34,48.86,5000", query);
        Assert.Contains("bias=proximity:2.34,48.86", query);
        Assert.Contains("categories=accommodation.hostel", query);
    }

    [Fact]
    public async Task NearbyPoiRetrievalReturnsCategorizedPlacesAndPreservesRealData()
    {
        var json = """
            {"features":[
                {"properties":{"place_id":"restaurant-1","name":"Bistro Parisien","categories":["catering.restaurant"],"formatted":"12 Rue de Paris","lat":48.856,"lon":2.352,"distance":320}},
                {"properties":{"place_id":"bad-poi","categories":["catering.restaurant"],"lat":999,"lon":2}},
                {"properties":{"place_id":"missing-name","categories":["catering.restaurant"],"formatted":"Unknown Street","lat":48.857,"lon":2.353,"distance":450}}
            ]}
            """;
        var handler = new Handler(json);
        var provider = Provider(handler);

        var result = await provider.Nearby(48.856, 2.352, "restaurants", 2000, default);
        Assert.Equal("restaurants", result.Category);
        Assert.Equal(2, result.Places.Length);
        Assert.Equal("Bistro Parisien", result.Places[0].Name);
        Assert.Equal("restaurant", result.Places[0].SubCategory);
        Assert.Equal(320, result.Places[0].DistanceMeters);
        Assert.Null(result.Places[1].Name);
        Assert.Equal(450, result.Places[1].DistanceMeters);

        var query = handler.Requests.Single().Query;
        Assert.Contains("categories=catering.restaurant", query);
        Assert.Contains("filter=circle:2.352,48.856,2000", query);
    }

    [Theory]
    [InlineData("cafes", "catering.cafe")]
    [InlineData("attractions", "tourism.sights")]
    [InlineData("transport", "public_transport")]
    [InlineData("healthcare", "healthcare.hospital")]
    [InlineData("shopping", "commercial.shopping_mall")]
    public async Task NearbySupportsAllRequiredCategories(string category, string expectedGeoCategory)
    {
        var handler = new Handler("{\"features\":[]}");
        var provider = Provider(handler);
        var result = await provider.Nearby(35.68, 139.69, category, 3000, default);
        Assert.Equal(category, result.Category);
        Assert.Contains(expectedGeoCategory, handler.Requests.Single().Query);
    }

    [Fact]
    public async Task NearbyControllerValidatesCoordinatesAndRadius()
    {
        var controller = new AccommodationsController(Provider(new Handler("{\"features\":[]}")));
        var badLat = await controller.Nearby(95, 10, "restaurants", 1000, default);
        Assert.IsType<BadRequestObjectResult>(badLat);

        var badLon = await controller.Nearby(10, 185, "restaurants", 1000, default);
        Assert.IsType<BadRequestObjectResult>(badLon);

        var badRadius = await controller.Nearby(10, 10, "restaurants", 50, default);
        Assert.IsType<BadRequestObjectResult>(badRadius);

        var ok = await controller.Nearby(48.85, 2.35, "restaurants", 1000, default);
        Assert.IsType<OkObjectResult>(ok);
    }
    [Fact]
    public async Task DetailsOnlyExposeProviderSupportedAmenitiesAndSafeMedia()
    {
        const string json = """
        {"features":[{"properties":{"place_id":"hotel","categories":["accommodation.hotel"],"lat":35.6,"lon":139.7,
        "internet_access":true,"swimming_pool":false,"wheelchair":"yes","air_conditioning":true,
        "website":"javascript:alert(1)","wiki_and_media":{"image":"https://api.geoapify.com/image?apiKey=secret"},"contact":{"phone":"provider-phone"}}}]}
        """;
        var property = await Provider(new Handler(json)).Details("hotel", default);
        Assert.NotNull(property);
        Assert.Equal(new[] { "Internet access", "Air conditioning" }, property.Amenities);
        Assert.Null(property.Website); Assert.Null(property.ImageUrl); Assert.Equal("provider-phone", property.Phone);
        var valid = json.Replace("javascript:alert(1)", "https://example.org/hotel")
            .Replace("https://api.geoapify.com/image?apiKey=secret", "https://example.org/photo.jpg");
        property = await Provider(new Handler(valid)).Details("hotel", default);
        Assert.Equal("https://example.org/hotel", property!.Website);
        Assert.Equal("https://example.org/photo.jpg", property.ImageUrl);
    }

}
