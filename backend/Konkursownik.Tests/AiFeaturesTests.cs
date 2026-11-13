using System.Net.Http.Json;
using System.Text.Json;
using Konkursownik.Api.Features.Ai;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Konkursownik.Tests;

[Collection("api")]
public class AiFeaturesTests(ApiFactory factory)
{
    private static async Task<bool> AiExtractionAsync(HttpClient client)
    {
        var res = await client.GetAsync("/api/features");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("aiExtraction").GetBoolean();
    }

    [Fact]
    public async Task Features_reports_ai_enabled_with_key()
    {
        var client = await factory.CreateUserClientAsync();
        Assert.True(await AiExtractionAsync(client));
    }

    [Fact]
    public async Task Features_reports_disabled_without_key()
    {
        var code = await factory.CreateInviteCodeAsync();
        await using var noKey = factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
            c.AddInMemoryCollection(new Dictionary<string, string?> { ["Gemini:ApiKey"] = "" })));
        var client = noKey.CreateClient();
        (await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest($"{Guid.NewGuid():N}@test.local", "Haslo123!", code))).EnsureSuccessStatusCode();

        Assert.False(await AiExtractionAsync(client));
    }

    [Fact]
    public async Task Features_requires_login()
    {
        var res = await factory.CreateClient().GetAsync("/api/features");
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Features_reports_disabled_while_quota_is_blocked()
    {
        var client = await factory.CreateUserClientAsync();
        var quota = factory.Services.GetRequiredService<GeminiQuota>();
        quota.BlockUntilNextReset();
        try { Assert.False(await AiExtractionAsync(client)); }
        finally { quota.Unblock(); }
        Assert.True(await AiExtractionAsync(client));
    }
}
