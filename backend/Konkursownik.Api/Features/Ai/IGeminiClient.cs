using System.Text.Json;
using System.Text.Json.Nodes;

namespace Konkursownik.Api.Features.Ai;

/// <summary>One input part: either text, or binary data with its MIME type.</summary>
public record GeminiPart(string? Text, byte[]? Data, string? MimeType);

/// <summary>Network error, timeout, 5xx, or the upstream quota being exhausted.</summary>
public class GeminiUnavailableException(string message, Exception? inner = null) : Exception(message, inner);

/// <summary>The app-wide Gemini rate budget (requests or tokens per minute) is currently used up.</summary>
public class GeminiBusyException() : Exception("Gemini request budget exhausted.");

public interface IGeminiClient
{
    /// <summary>Returns the structured JSON answer, or null when the model's text is not parseable JSON.</summary>
    Task<JsonElement?> GenerateJsonAsync(string prompt, IReadOnlyList<GeminiPart> parts, JsonObject responseSchema, CancellationToken ct);
}
