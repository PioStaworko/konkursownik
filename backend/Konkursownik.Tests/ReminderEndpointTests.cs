using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Reminders;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ReminderEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Returns_only_own_reminders()
    {
        var a = await factory.CreateUserClientAsync();
        var b = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(a, Samples.Contest(name: "Mój", end: "2026-11-13"));

        var mine = await a.GetFromJsonAsync<List<Reminder>>("/api/reminders", JsonConfig.Options);
        var theirs = await b.GetFromJsonAsync<List<Reminder>>("/api/reminders", JsonConfig.Options);

        var r = Assert.Single(mine!);
        Assert.Equal(ReminderKind.EndingSoon, r.Kind);
        Assert.Equal(id, r.ContestId);
        Assert.Equal("Mój", r.ContestName);
        Assert.Empty(theirs!);
    }
}
