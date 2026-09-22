using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace TravelWise.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("destinations")]
public class DestinationsController(IHttpClientFactory clients, IConfiguration configuration, IMemoryCache cache) : ControllerBase
{
    public record Destination(int Id, string Name, string Country, string Region, double Latitude, double Longitude);
    public record Photo(string Url, string Alt, string Photographer, string ProfileUrl, string SourceUrl);

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? query, CancellationToken cancellationToken)
    {
        query = query?.Trim();
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2 || query.Length > 100)
            return BadRequest(new { message = "Enter a destination between 2 and 100 characters." });
        var key = "destinations:" + query.ToLowerInvariant();
        if (cache.TryGetValue(key, out Destination[]? cached)) return Ok(new { destinations = cached });
        try
        {
            using var response = await clients.CreateClient("Destinations").GetAsync(
                "https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json&name=" + Uri.EscapeDataString(query), cancellationToken);
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            var results = json.RootElement.TryGetProperty("results", out var list)
                ? list.EnumerateArray().Select(p => new Destination(p.GetProperty("id").GetInt32(), Text(p, "name"),
                    Text(p, "country"), Text(p, "admin1"), p.GetProperty("latitude").GetDouble(), p.GetProperty("longitude").GetDouble())).ToArray()
                : Array.Empty<Destination>();
            cache.Set(key, results, TimeSpan.FromMinutes(30));
            return Ok(new { destinations = results });
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
        {
            if (cancellationToken.IsCancellationRequested) throw;
            return StatusCode(503, new { message = "Destination search is unavailable. Please try again or enter your destination in Trip Planning." });
        }
    }

    [HttpGet("photo")]
    public async Task<IActionResult> GetPhoto([FromQuery] string? query, CancellationToken cancellationToken)
    {
        query = query?.Trim();
        if (string.IsNullOrWhiteSpace(query) || query.Length > 100) return BadRequest();
        var key = "photo:" + query.ToLowerInvariant();
        if (cache.TryGetValue(key, out Photo? cached)) return Ok(new { photo = cached });
        var accessKey = configuration["UNSPLASH_ACCESS_KEY"];
        if (string.IsNullOrWhiteSpace(accessKey)) return Ok(new { photo = (Photo?)null });
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get,
                "https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&content_filter=high&query=" + Uri.EscapeDataString(query + " travel"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Client-ID", accessKey);
            request.Headers.Add("Accept-Version", "v1");
            using var response = await clients.CreateClient("Destinations").SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
            Photo? photo = null;
            var results = json.RootElement.GetProperty("results");
            if (results.GetArrayLength() > 0)
            {
                var p = results[0];
                var user = p.GetProperty("user");
                var imageUrl = Text(p.GetProperty("urls"), "regular");
                if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "images.unsplash.com")
                    photo = new Photo(imageUrl, Text(p, "alt_description"), Text(user, "name"),
                        Attribution(Text(user.GetProperty("links"), "html")), Attribution(Text(p.GetProperty("links"), "html")));
            }
            cache.Set(key, photo, TimeSpan.FromHours(1));
            return Ok(new { photo });
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException or KeyNotFoundException or InvalidOperationException)
        {
            if (cancellationToken.IsCancellationRequested) throw;
            return Ok(new { photo = (Photo?)null });
        }
    }

    private static string Text(JsonElement element, string key) => element.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? "" : "";
    private static string Attribution(string url) => Uri.TryCreate(url, UriKind.Absolute, out var uri) && uri.Scheme == "https" && uri.Host == "unsplash.com"
        ? url + (url.Contains('?') ? "&" : "?") + "utm_source=travelwise&utm_medium=referral" : "https://unsplash.com/?utm_source=travelwise&utm_medium=referral";
}
