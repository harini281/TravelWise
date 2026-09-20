using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using TravelWise.API.DTO;
using TravelWise.API.Services;

namespace TravelWise.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
[EnableRateLimiting("destinations")]
public class AccommodationsController(GeoapifyService provider) : ControllerBase
{
    [HttpGet("destinations")]
    public async Task<IActionResult> Destinations([FromQuery] string? query, CancellationToken cancellationToken)
    {
        query = query?.Trim();
        if (string.IsNullOrWhiteSpace(query) || query.Length < 2 || query.Length > 100)
            return BadRequest(new { message = "Enter a destination between 2 and 100 characters." });
        return await ProviderResult(async () => Ok(new { destinations = await provider.Autocomplete(query, cancellationToken) }));
    }

    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] AccommodationSearchRequest request, CancellationToken cancellationToken)
    {
        // ApiController validates data annotations and date/destination rules before this action.
        return await ProviderResult(async () => Ok(await provider.Search(request, cancellationToken)));
    }

    [HttpGet("details")]
    public async Task<IActionResult> Details([FromQuery] string? providerId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(providerId) || providerId.Length > 512)
            return BadRequest(new { message = "A property provider ID is required." });
        return await ProviderResult(async () =>
        {
            var property = await provider.Details(providerId, cancellationToken);
            return property is null ? NotFound(new { message = "Property details are not available." }) : Ok(property);
        });
    }

    private async Task<IActionResult> ProviderResult(Func<Task<IActionResult>> action)
    {
        try { return await action(); }
        catch (AccommodationProviderException ex) { return StatusCode(ex.StatusCode, new { message = ex.Message }); }
    }
}
