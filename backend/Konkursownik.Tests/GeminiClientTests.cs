using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Konkursownik.Api.Features.Ai;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Konkursownik.Tests;

public class GeminiClientTests
{
    private sealed class StubHandler(HttpStatusCode status, string body) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }
        public string? RequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            RequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };
        }
    }

    private static readonly JsonObject Schema = new() { ["type"] = "object" };

    private static string Candidate(string text, int tokens = 321) =>
        new JsonObject
        {
            ["candidates"] = new JsonArray(new JsonObject
            {
                ["content"] = new JsonObject { ["parts"] = new JsonArray(new JsonObject { ["text"] = text }) },
            }),
            ["usageMetadata"] = new JsonObject { ["totalTokenCount"] = tokens },
        }.ToJsonString();

    private static (GeminiClient Client, GeminiQuota Quota, FakeTimeProvider Time, StubHandler Handler) Create(HttpStatusCode status, string body)
    {
        var time = new FakeTimeProvider(DateTimeOffset.Parse("2026-11-12T10:00:00Z"));
        var options = Options.Create(new GeminiOptions { ApiKey = "secret-key", Model = "test-model" });
        var quota = new GeminiQuota(options, time);
        var handler = new StubHandler(status, body);
        return (new GeminiClient(new HttpClient(handler), options, quota), quota, time, handler);
    }

    [Fact]
    public async Task GeminiClient_parses_json_candidate()
    {
        var (client, _, _, handler) = Create(HttpStatusCode.OK, Candidate("""{"store":"Biedronka"}"""));

        var result = await client.GenerateJsonAsync("Read it", [new GeminiPart("hello", null, null)], Schema, default);

        Assert.Equal("Biedronka", result!.Value.GetProperty("store").GetString());
        Assert.Equal("secret-key", handler.Request!.Headers.GetValues("x-goog-api-key").Single());
        Assert.DoesNotContain("secret-key", handler.Request.RequestUri!.ToString());
        Assert.Contains("test-model:generateContent", handler.Request.RequestUri.ToString());
        Assert.Contains("application/json", handler.RequestBody!);
    }

    [Fact]
    public async Task GeminiClient_unparsable_text_returns_null()
    {
        var (client, _, _, _) = Create(HttpStatusCode.OK, Candidate("this is not json"));
        Assert.Null(await client.GenerateJsonAsync("Read it", [], Schema, default));
    }

    [Fact]
    public async Task GeminiClient_500_throws_unavailable()
    {
        var (client, quota, _, _) = Create(HttpStatusCode.InternalServerError, "{}");
        await Assert.ThrowsAsync<GeminiUnavailableException>(() => client.GenerateJsonAsync("Read it", [], Schema, default));
        Assert.False(quota.IsBlocked);
    }

    [Fact]
    public async Task Upstream_429_blocks_until_pacific_midnight()
    {
        var (client, quota, time, _) = Create(HttpStatusCode.TooManyRequests, "{}");

        await Assert.ThrowsAsync<GeminiUnavailableException>(() => client.GenerateJsonAsync("Read it", [], Schema, default));
        Assert.True(quota.IsBlocked);

        // 10:00Z on Nov 12 is 02:00 PST; Pacific midnight is 08:00Z on Nov 13.
        time.SetUtcNow(DateTimeOffset.Parse("2026-11-13T07:59:00Z"));
        Assert.True(quota.IsBlocked);
        time.SetUtcNow(DateTimeOffset.Parse("2026-11-13T08:01:00Z"));
        Assert.False(quota.IsBlocked);
    }

    [Fact]
    public async Task Blocked_quota_throws_unavailable_without_calling_gemini()
    {
        var (client, quota, _, handler) = Create(HttpStatusCode.OK, Candidate("{}"));
        quota.BlockUntilNextReset();
        await Assert.ThrowsAsync<GeminiUnavailableException>(() => client.GenerateJsonAsync("Read it", [], Schema, default));
        Assert.Null(handler.Request);
    }

    [Fact]
    public async Task Exhausted_quota_throws_busy()
    {
        var (client, quota, _, handler) = Create(HttpStatusCode.OK, Candidate("{}"));
        Assert.NotNull(quota.TryAcquire(249_000));
        await Assert.ThrowsAsync<GeminiBusyException>(() => client.GenerateJsonAsync(new string('a', 40_000), [], Schema, default));
        Assert.Null(handler.Request);
    }
}
