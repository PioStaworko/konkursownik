using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Stats;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class StatsTests(ApiFactory factory)
{
    private static async Task AddEntryAsync(HttpClient c, Guid contestId, decimal? amount) =>
        (await c.PostAsJsonAsync($"/api/contests/{contestId}/entries",
            new EntryUpsertDto(DateOnly.Parse("2026-11-12"), null, null, amount, null, null, null), JsonConfig.Options))
            .EnsureSuccessStatusCode();

    [Fact]
    public async Task Stats_sums_spent_and_won()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await Samples.CreateContestAsync(c, Samples.Contest(name: "Drugi"));
        await AddEntryAsync(c, id, 12.50m);
        await AddEntryAsync(c, id, 7.49m);
        await AddEntryAsync(c, id, null);
        (await c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Nagroda", 100m, null, false), JsonConfig.Options))
            .EnsureSuccessStatusCode();

        // another user's data must not leak in
        var other = await factory.CreateUserClientAsync();
        var oid = await Samples.CreateContestAsync(other, Samples.Contest());
        await AddEntryAsync(other, oid, 50m);

        var s = (await c.GetFromJsonAsync<StatsDto>("/api/stats", JsonConfig.Options))!;
        Assert.Equal(2, s.Contests);
        Assert.Equal(3, s.Entries);
        Assert.Equal(1, s.Wins);
        Assert.Equal(19.99m, s.TotalSpent);
        Assert.Equal(100m, s.TotalWonValue);
    }

    [Fact]
    public async Task Stats_empty_is_all_zero()
    {
        var c = await factory.CreateUserClientAsync();
        var s = (await c.GetFromJsonAsync<StatsDto>("/api/stats", JsonConfig.Options))!;
        Assert.Equal(new StatsDto(0, 0, 0, 0m, 0m), s);
    }
}
