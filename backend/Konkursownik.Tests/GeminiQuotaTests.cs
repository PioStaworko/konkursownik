using Konkursownik.Api.Features.Ai;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;

namespace Konkursownik.Tests;

public class GeminiQuotaTests
{
    private static (GeminiQuota Quota, FakeTimeProvider Time) Create()
    {
        var time = new FakeTimeProvider(DateTimeOffset.Parse("2026-11-12T10:00:00Z"));
        return (new GeminiQuota(Options.Create(new GeminiOptions { ApiKey = "k", Model = "m" }), time), time);
    }

    [Fact]
    public void Quota_allows_15_per_minute_then_rejects()
    {
        var (quota, time) = Create();
        for (var i = 0; i < 15; i++) Assert.True(quota.TryAcquire(100));
        Assert.False(quota.TryAcquire(100));
        time.Advance(TimeSpan.FromSeconds(61));
        Assert.True(quota.TryAcquire(100));
    }

    [Fact]
    public void Quota_rejects_when_token_budget_exceeded()
    {
        var (quota, _) = Create();
        Assert.True(quota.TryAcquire(240_000));
        Assert.False(quota.TryAcquire(20_000));
    }

    [Fact]
    public void Quota_record_uses_actual_tokens()
    {
        var (quota, _) = Create();
        Assert.True(quota.TryAcquire(200_000));
        quota.Record(20_000, 200_000);
        Assert.True(quota.TryAcquire(200_000));
    }
}
