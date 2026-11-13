using Konkursownik.Api.Features.Photos;
using Microsoft.AspNetCore.Mvc;

namespace Konkursownik.Api.Features.Ai;

public static class AiEndpoints
{
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
    }
}
