namespace Konkursownik.Api.Features.Ai;

public class GeminiOptions
{
    public const string Section = "Gemini";

    public string? ApiKey { get; set; }
    public string Model { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 30;
    public int RequestsPerHour { get; set; } = 30;
    public int MaxRequestsPerMinute { get; set; } = 15;
    public int MaxTokensPerMinute { get; set; } = 250_000;
    /// <summary>Share of <see cref="MaxTokensPerMinute"/> kept free as a safety margin against underestimates.</summary>
    public int TokenHeadroomPercent { get; set; } = 10;
    public string QuotaResetTimeZone { get; set; } = "America/Los_Angeles";

    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey) && Model != "";
}
