using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ContestEndpointTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static Task<List<ContestCardDto>?> ListAsync(HttpClient c, string? view = null) =>
        c.GetFromJsonAsync<List<ContestCardDto>>("/api/contests" + (view is null ? "" : $"?view={view}"), JsonConfig.Options);

    [Fact]
    public async Task Create_then_get_roundtrips_children_in_order()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(tasks: ["Zarejestruj kod", "Wyślij SMS"]));
        var got = await GetAsync(c, id);
        Assert.Equal(["Zarejestruj kod", "Wyślij SMS"], got!.Tasks.Select(t => t.Text));
        Assert.All(got.Tasks, t => Assert.NotNull(t.Id));
    }

    [Fact]
    public async Task Put_updates_keeps_ids_and_removes_missing_children()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(tasks: ["Pierwszy", "Stary"]));
        var before = await GetAsync(c, id);
        var first = before!.Tasks[0];

        var upsert = Samples.Contest() with
        {
            Tasks = [new TaskDto(first.Id, "Pierwszy", true), new TaskDto(null, "Nowy", false)],
        };
        var res = await c.PutAsJsonAsync($"/api/contests/{id}", upsert, JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var after = await GetAsync(c, id);
        Assert.Equal(2, after!.Tasks.Count);
        Assert.Equal(first.Id, after.Tasks[0].Id);
        Assert.True(after.Tasks[0].Done);
        Assert.Equal("Nowy", after.Tasks[1].Text);
        Assert.DoesNotContain(after.Tasks, t => t.Text == "Stary");
    }

    [Fact]
    public async Task Put_with_foreign_child_id_creates_new_child_and_leaves_other_contest_untouched()
    {
        var victim = await factory.CreateUserClientAsync();
        var vid = await Samples.CreateContestAsync(victim, Samples.Contest(tasks: ["Cudzy"]));
        var foreignTask = (await GetAsync(victim, vid))!.Tasks[0];

        var attacker = await factory.CreateUserClientAsync();
        var aid = await Samples.CreateContestAsync(attacker, Samples.Contest());
        var upsert = Samples.Contest() with { Tasks = [new TaskDto(foreignTask.Id, "Podszyty", true)] };
        var res = await attacker.PutAsJsonAsync($"/api/contests/{aid}", upsert, JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var mine = await GetAsync(attacker, aid);
        Assert.Single(mine!.Tasks);
        Assert.NotEqual(foreignTask.Id, mine.Tasks[0].Id);
        var theirs = await GetAsync(victim, vid);
        Assert.Equal("Cudzy", Assert.Single(theirs!.Tasks).Text);
        Assert.False(theirs.Tasks[0].Done);
    }

    [Fact]
    public async Task End_before_start_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        var res = await c.PostAsJsonAsync("/api/contests",
            Samples.Contest(start: "2026-11-20", end: "2026-11-10"), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Other_users_contest_returns_404_for_get_put_delete()
    {
        var owner = await factory.CreateUserClientAsync();
        var other = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/contests/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PutAsJsonAsync($"/api/contests/{id}", Samples.Contest(name: "Hack"), JsonConfig.Options)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/contests/{id}")).StatusCode);
        Assert.Equal("Test", (await GetAsync(owner, id))!.Name);
    }

    [Fact]
    public async Task List_shows_only_own_contests()
    {
        var a = await factory.CreateUserClientAsync();
        var b = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(a, Samples.Contest(name: "A1"));
        await Samples.CreateContestAsync(b, Samples.Contest(name: "B1"));

        Assert.Equal(["A1"], (await ListAsync(a))!.Select(s => s.Name));
        Assert.Equal(["B1"], (await ListAsync(b))!.Select(s => s.Name));
    }

    [Fact]
    public async Task Archive_view_contains_lost_and_archived_only()
    {
        var c = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(c, Samples.Contest(name: "P", status: ContestStatus.Planned));
        await Samples.CreateContestAsync(c, Samples.Contest(name: "L", status: ContestStatus.Lost));
        await Samples.CreateContestAsync(c, Samples.Contest(name: "A", status: ContestStatus.Archived));

        Assert.Equal(["P"], (await ListAsync(c, "active"))!.Select(s => s.Name));
        Assert.Equal(["P"], (await ListAsync(c, "bogus"))!.Select(s => s.Name));
        Assert.Equal(["A", "L"], (await ListAsync(c, "archive"))!.Select(s => s.Name).Order());
    }

    [Fact]
    public async Task Active_sorted_by_end_date_ascending()
    {
        var c = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(c, Samples.Contest(name: "Late", end: "2026-12-20"));
        await Samples.CreateContestAsync(c, Samples.Contest(name: "Soon", end: "2026-11-15"));
        Assert.Equal(["Soon", "Late"], (await ListAsync(c))!.Select(s => s.Name));
    }

    [Fact]
    public async Task Submitted_after_end_has_effective_status_awaiting()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c,
            Samples.Contest(end: "2026-11-10", status: ContestStatus.Submitted));
        Assert.Equal(ContestStatus.AwaitingResults, (await GetAsync(c, id))!.EffectiveStatus);
        Assert.Equal(ContestStatus.AwaitingResults, (await ListAsync(c))!.Single().EffectiveStatus);
    }

    [Fact]
    public async Task Delete_removes_contest()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(tasks: ["x"]));
        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/contests/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/contests/{id}")).StatusCode);
    }

    [Fact]
    public async Task Anonymous_returns_401()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await factory.CreateClient().GetAsync("/api/contests")).StatusCode);
    }
}
