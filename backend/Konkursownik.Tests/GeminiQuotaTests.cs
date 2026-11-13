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
        for (var i = 0; i < 15; i++) Assert.NotNull(quota.TryAcquire(100));
        Assert.Null(quota.TryAcquire(100));
        time.Advance(TimeSpan.FromSeconds(61));
        Assert.NotNull(quota.TryAcquire(100));
    }

    [Fact]
    public void Quota_rejects_when_token_budget_exceeded()
    {
        var (quota, _) = Create();
        Assert.NotNull(quota.TryAcquire(240_000));
        Assert.Null(quota.TryAcquire(20_000));
    }

    [Fact]
    public void Quota_record_uses_actual_tokens()
    {
        var (quota, _) = Create();
        var reservation = quota.TryAcquire(200_000);
        Assert.NotNull(reservation);
        quota.Record(reservation, 20_000);
        Assert.NotNull(quota.TryAcquire(200_000));
    }

    [Fact]
    public void Quota_record_updates_reservation_in_place_for_the_whole_window()
    {
        var (quota, time) = Create();
        var reservation = quota.TryAcquire(200_000);
        quota.Record(reservation!, 20_000);

        time.Advance(TimeSpan.FromSeconds(30));
        Assert.NotNull(quota.TryAcquire(230_000)); // 20_000 actual + 230_000 = exactly the budget
        Assert.Null(quota.TryAcquire(1));          // nothing undercounted: the budget is full
        time.Advance(TimeSpan.FromSeconds(29));    // t=59 s: the reservation still counts
        Assert.Null(quota.TryAcquire(20_000));
        time.Advance(TimeSpan.FromSeconds(1));     // t=60 s: original timestamp + 60 s frees it
        Assert.NotNull(quota.TryAcquire(20_000));
    }

    [Fact]
    public async Task Quota_block_state_is_safe_under_concurrent_access()
    {
        var (quota, _) = Create();
        await Task.WhenAll(Enumerable.Range(0, 8).Select(worker => Task.Run(() =>
        {
            for (var i = 0; i < 500; i++)
            {
                quota.BlockUntilNextReset();
                _ = quota.IsBlocked;
                quota.Unblock();
            }
        })));
        Assert.False(quota.IsBlocked);
    }
}
