using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Options;

namespace Konkursownik.Api.Features.Ai;

public class GeminiClient(HttpClient http, IOptions<GeminiOptions> options, GeminiQuota quota) : IGeminiClient
{
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";

    public async Task<JsonElement?> GenerateJsonAsync(string prompt, IReadOnlyList<GeminiPart> parts, JsonObject responseSchema, CancellationToken ct)
    {
        var o = options.Value;
        if (!o.Enabled || quota.IsBlocked) throw new GeminiUnavailableException("Gemini is disabled or blocked.");

        var estimate = Estimate(prompt, parts);
        if (!quota.TryAcquire(estimate)) throw new GeminiBusyException();

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}{Uri.EscapeDataString(o.Model)}:generateContent")
        {
            Content = JsonContent.Create(BuildBody(prompt, parts, responseSchema)),
        };
        request.Headers.Add("x-goog-api-key", o.ApiKey);

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(request, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            quota.Record(0, estimate);
            throw new GeminiUnavailableException("Gemini request failed.", ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                quota.Record(0, estimate);
                quota.BlockUntilNextReset();
                throw new GeminiUnavailableException("Gemini quota exhausted.");
            }
            if (!response.IsSuccessStatusCode)
            {
                quota.Record(0, estimate);
                throw new GeminiUnavailableException($"Gemini returned {(int)response.StatusCode}.");
            }

            JsonElement root;
            try
            {
                root = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
            }
            catch (JsonException)
            {
                quota.Record(0, estimate);
                return null;
            }

            var actual = root.TryGetProperty("usageMetadata", out var usage)
                         && usage.TryGetProperty("totalTokenCount", out var total) && total.TryGetInt32(out var t) ? t : estimate;
            quota.Record(actual, estimate);
            return ExtractJson(root);
        }
    }

    internal static int Estimate(string prompt, IReadOnlyList<GeminiPart> parts)
    {
        var tokens = prompt.Length / 4;
        foreach (var p in parts)
        {
            if (p.Text is not null) tokens += p.Text.Length / 4;
            else if (p.Data is not null)
                tokens += p.MimeType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) == true ? 1_300 : p.Data.Length / 1024 / 4;
        }
        return tokens;
    }

    private static JsonObject BuildBody(string prompt, IReadOnlyList<GeminiPart> parts, JsonObject schema)
    {
        var jsonParts = new JsonArray(new JsonObject { ["text"] = prompt });
        foreach (var p in parts)
        {
            if (p.Text is not null) jsonParts.Add(new JsonObject { ["text"] = p.Text });
            else if (p.Data is not null)
                jsonParts.Add(new JsonObject
                {
                    ["inlineData"] = new JsonObject { ["mimeType"] = p.MimeType, ["data"] = Convert.ToBase64String(p.Data) },
                });
        }
        return new JsonObject
        {
            ["contents"] = new JsonArray(new JsonObject { ["parts"] = jsonParts }),
            ["generationConfig"] = new JsonObject
            {
                ["responseMimeType"] = "application/json",
                ["responseJsonSchema"] = schema.DeepClone(),
            },
        };
    }

    private static JsonElement? ExtractJson(JsonElement root)
    {
        try
        {
            var text = string.Concat(root.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")
                .EnumerateArray().Select(p => p.TryGetProperty("text", out var t) ? t.GetString() : null));
            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.Clone();
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException or ArgumentException)
        {
            return null;
        }
    }
}
