using System.Threading.RateLimiting;
using Konkursownik.Api.Common;
using Microsoft.Extensions.Options;

namespace Konkursownik.Api.Features.Ai;

public static class AiFeatures
{
    public const string RateLimitPolicy = "ai";

    public static void MapAiFeatureEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapGet("/features", (IOptions<GeminiOptions> options, GeminiQuota quota) =>
            new { aiExtraction = options.Value.Enabled && !quota.IsBlocked });
    }

    public static IServiceCollection AddAiServices(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<GeminiOptions>(config.GetSection(GeminiOptions.Section));
        services.AddSingleton<GeminiQuota>();
        services.AddHttpClient<IGeminiClient, GeminiClient>((sp, http) =>
            http.Timeout = TimeSpan.FromSeconds(sp.GetRequiredService<IOptions<GeminiOptions>>().Value.TimeoutSeconds));

        services.AddRateLimiter(o =>
        {
            o.OnRejected = async (ctx, ct) =>
            {
                ctx.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await ctx.HttpContext.Response.WriteAsJsonAsync(new { error = "rate_limited" }, ct);
            };
            o.AddPolicy(RateLimitPolicy, http =>
                RateLimitPartition.GetFixedWindowLimiter(http.User.UserId(), _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, http.RequestServices.GetRequiredService<IOptions<GeminiOptions>>().Value.RequestsPerHour),
                    Window = TimeSpan.FromHours(1),
                    QueueLimit = 0,
                }));
        });
        return services;
    }

    /// <summary>Endpoint filter: 503 <c>ai_unavailable</c> while AI is not configured or the Gemini quota is blocked.</summary>
    public static RouteHandlerBuilder RequireAiEnabled(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (ctx, next) =>
        {
            var options = ctx.HttpContext.RequestServices.GetRequiredService<IOptions<GeminiOptions>>().Value;
            var quota = ctx.HttpContext.RequestServices.GetRequiredService<GeminiQuota>();
            return options.Enabled && !quota.IsBlocked
                ? await next(ctx)
                : Results.Json(new { error = "ai_unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
        });

    /// <summary>Runs a Gemini call, mapping busy to 429 <c>ai_busy</c> and unavailable to 503 <c>ai_unavailable</c>.</summary>
    public static async Task<IResult> MapGeminiErrors(Func<Task<IResult>> call)
    {
        try { return await call(); }
        catch (GeminiBusyException)
        {
            return Results.Json(new { error = "ai_busy" }, statusCode: StatusCodes.Status429TooManyRequests);
        }
        catch (GeminiUnavailableException)
        {
            return Results.Json(new { error = "ai_unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
}
