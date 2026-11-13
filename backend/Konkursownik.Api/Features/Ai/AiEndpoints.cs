using System.Text.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Photos;
using Microsoft.AspNetCore.Mvc;

namespace Konkursownik.Api.Features.Ai;

public record ContestUrlRequest(string? Url);

public static class AiEndpoints
{
    private const int MaxPdfBytes = 15 * 1024 * 1024;
    private const long ContestRequestLimit = 16 * 1024 * 1024;
    private static readonly byte[] PdfSignature = "%PDF-"u8.ToArray();

    /// <summary>AI extraction endpoints; the passed group already carries RequireAuthorization. Nothing is stored.</summary>
    public static void MapAiEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapPost("/ai/receipt", async (IFormFile? file, IGeminiClient gemini, CancellationToken ct) =>
            {
                if (file is null) return Results.BadRequest(new { error = "unsupported_type" });

                var buffer = await PhotoEndpoints.ReadBoundedAsync(file, ct);
                if (buffer is null) return Results.BadRequest(new { error = "too_large" });
                var contentType = PhotoEndpoints.DetectContentType(buffer);
                if (contentType is null) return Results.BadRequest(new { error = "unsupported_type" });

                return await AiFeatures.MapGeminiErrors(async () =>
                {
                    var json = await gemini.GenerateJsonAsync(ReceiptExtraction.Prompt,
                        [new GeminiPart(null, buffer.ToArray(), contentType)], ReceiptExtraction.Schema, ct);
                    return json is { } answer
                        ? Results.Ok(ReceiptExtraction.Map(answer))
                        : Results.UnprocessableEntity(new { error = "extraction_failed" });
                });
            })
            .RequireRateLimiting(AiFeatures.RateLimitPolicy)
            .RequireAiEnabled()
            .WithMetadata(new RequestSizeLimitAttribute(PhotoEndpoints.RequestLimit))
            // CSRF: the auth cookie is SameSite=Lax and the API is same-origin JSON/multipart from our SPA only, so antiforgery tokens are not used.
            .DisableAntiforgery();

        // One route, two input shapes: JSON { url } (server fetches the page) or multipart `file` (PDF or image).
        secured.MapPost("/ai/contest", async (HttpRequest request, IPageFetcher fetcher, IGeminiClient gemini, CancellationToken ct) =>
            {
                if (request.HasJsonContentType()) return await ExtractFromUrlAsync(request, fetcher, gemini, ct);
                if (request.HasFormContentType) return await ExtractFromFileAsync(request, gemini, ct);
                return Results.BadRequest(new { error = "unsupported_type" });
            })
            .RequireRateLimiting(AiFeatures.RateLimitPolicy)
            .RequireAiEnabled()
            .WithMetadata(new RequestSizeLimitAttribute(ContestRequestLimit))
            // CSRF: the auth cookie is SameSite=Lax and the API is same-origin JSON/multipart from our SPA only, so antiforgery tokens are not used.
            .DisableAntiforgery();
    }

    private static async Task<IResult> ExtractFromUrlAsync(HttpRequest request, IPageFetcher fetcher, IGeminiClient gemini, CancellationToken ct)
    {
        ContestUrlRequest? body;
        try { body = await request.ReadFromJsonAsync<ContestUrlRequest>(JsonConfig.Options, ct); }
        catch (JsonException) { body = null; }

        if (body?.Url is not { } raw || raw.Length > 2048
            || !Uri.TryCreate(raw.Trim(), UriKind.Absolute, out var url) || !PageFetcher.IsFetchable(url))
            return Results.BadRequest(new { error = "invalid_url" });

        var page = await fetcher.FetchAsync(url, ct);
        if (page is null) return Results.UnprocessableEntity(new { error = "page_unreadable" });

        var material = $"Adres strony: {url}\nTytuł: {page.Title}\n" +
            (page.Links.Count > 0 ? "Linki do regulaminu lub PDF:\n" + string.Join('\n', page.Links) + "\n" : "") +
            "Treść strony:\n" + page.Text;

        return await AiFeatures.MapGeminiErrors(async () =>
        {
            var json = await gemini.GenerateJsonAsync(ContestExtraction.Prompt, [new GeminiPart(material, null, null)], ContestExtraction.Schema, ct);
            if (json is not { } answer) return Results.UnprocessableEntity(new { error = "extraction_failed" });
            var dto = ContestExtraction.Map(answer);
            return Results.Ok(dto.Url is null ? dto with { Url = url.ToString() } : dto);
        });
    }

    private static async Task<IResult> ExtractFromFileAsync(HttpRequest request, IGeminiClient gemini, CancellationToken ct)
    {
        var form = await request.ReadFormAsync(ct);
        if (form.Files.GetFile("file") is not { } file) return Results.BadRequest(new { error = "unsupported_type" });

        var buffer = await PhotoEndpoints.ReadBoundedAsync(file, ct, MaxPdfBytes);
        if (buffer is null) return Results.BadRequest(new { error = "too_large" });

        string mimeType;
        if (buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, PdfSignature.Length)).SequenceEqual(PdfSignature))
            mimeType = "application/pdf";
        else if (PhotoEndpoints.DetectContentType(buffer) is { } image)
        {
            if (buffer.Length > PhotoEndpoints.MaxBytes) return Results.BadRequest(new { error = "too_large" });
            mimeType = image;
        }
        else return Results.BadRequest(new { error = "unsupported_type" });

        return await AiFeatures.MapGeminiErrors(async () =>
        {
            var json = await gemini.GenerateJsonAsync(ContestExtraction.Prompt,
                [new GeminiPart(null, buffer.ToArray(), mimeType)], ContestExtraction.Schema, ct);
            return json is { } answer
                ? Results.Ok(ContestExtraction.Map(answer))
                : Results.UnprocessableEntity(new { error = "extraction_failed" });
        });
    }
}
