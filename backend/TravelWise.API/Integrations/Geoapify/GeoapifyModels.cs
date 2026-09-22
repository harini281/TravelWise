namespace TravelWise.API.Integrations.Geoapify;

public sealed record GeoapifyOptions(string? ApiKey);

public sealed class AccommodationProviderException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

// Shared by all users in one backend process. Conservative free-tier guard, not a billing meter.
// Provider account usage must also be monitored if other apps/instances share its key.
public sealed class GeoapifyRequestBudget
{
    private readonly object gate = new();
    private readonly Queue<DateTime> recent = new();
    private DateOnly day;
    private int credits;

    public void Reserve(int cost)
    {
        lock (gate)
        {
            var now = DateTime.UtcNow;
            if (day != DateOnly.FromDateTime(now)) { day = DateOnly.FromDateTime(now); credits = 0; }
            while (recent.TryPeek(out var time) && now - time >= TimeSpan.FromSeconds(1)) recent.Dequeue();
            if (credits + cost > 2800)
                throw new AccommodationProviderException(429, "The accommodation search allowance is temporarily exhausted. Try again later.");
            if (recent.Count >= 4)
                throw new AccommodationProviderException(429, "Accommodation search is busy. Please try again in a moment.");
            credits += cost;
            recent.Enqueue(now);
        }
    }
}
