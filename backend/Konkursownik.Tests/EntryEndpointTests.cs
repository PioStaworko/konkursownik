using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class EntryEndpointTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static EntryUpsertDto Entry(string date, string? code = null, decimal? amount = null, string? answer = null) =>
        new(DateOnly.Parse(date), code, null, amount, null, answer, null);

    private static async Task<Guid> AddEntryAsync(HttpClient c, Guid contestId, EntryUpsertDto dto)
    {
        var res = await c.PostAsJsonAsync($"/api/contests/{contestId}/entries", dto, JsonConfig.Options);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
    }

    [Fact]
    public async Task Add_entry_appears_in_contest_and_counts_today()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await AddEntryAsync(c, id, Entry("2026-11-12", code: "ABC"));
        await AddEntryAsync(c, id, Entry("2026-11-11"));

        var got = await GetAsync(c, id);
        Assert.Equal(2, got!.Entries.Count);
        Assert.Equal(1, got.EntriesToday);
        Assert.Equal("ABC", got.Entries[0].ConfirmationCode);
    }

    [Fact]
    public async Task Update_and_delete_entry()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        var entryId = await AddEntryAsync(c, id, Entry("2026-11-12"));

        var put = await c.PutAsJsonAsync($"/api/entries/{entryId}", Entry("2026-11-10", code: "XYZ", amount: 12.5m, answer: "Odp"), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);
        var e = (await GetAsync(c, id))!.Entries.Single();
        Assert.Equal(DateOnly.Parse("2026-11-10"), e.Date);
        Assert.Equal("XYZ", e.ConfirmationCode);
        Assert.Equal(12.5m, e.PurchaseAmount);
        Assert.Equal("Odp", e.AnswerText);

        var del = await c.DeleteAsync($"/api/entries/{entryId}");
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);
        Assert.Empty((await GetAsync(c, id))!.Entries);
    }

    [Fact]
    public async Task Invalid_entry_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        var neg = await c.PostAsJsonAsync($"/api/contests/{id}/entries", Entry("2026-11-12", amount: -1m), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, neg.StatusCode);
        var longCode = await c.PostAsJsonAsync($"/api/contests/{id}/entries", Entry("2026-11-12", code: new string('a', 201)), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, longCode.StatusCode);
        var longAnswer = await c.PostAsJsonAsync($"/api/contests/{id}/entries", Entry("2026-11-12", answer: new string('a', 5001)), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, longAnswer.StatusCode);
    }

    [Fact]
    public async Task Other_users_entry_returns_404_for_put_and_delete()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        var entryId = await AddEntryAsync(owner, id, Entry("2026-11-12", code: "KEEP"));

        var other = await factory.CreateUserClientAsync();
        var put = await other.PutAsJsonAsync($"/api/entries/{entryId}", Entry("2026-11-01", code: "HACK"), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        var del = await other.DeleteAsync($"/api/entries/{entryId}");
        Assert.Equal(HttpStatusCode.NotFound, del.StatusCode);

        var e = (await GetAsync(owner, id))!.Entries.Single();
        Assert.Equal("KEEP", e.ConfirmationCode);
    }

    [Fact]
    public async Task Add_entry_to_other_users_contest_returns_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        var other = await factory.CreateUserClientAsync();
        var res = await other.PostAsJsonAsync($"/api/contests/{id}/entries", Entry("2026-11-12"), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Empty((await GetAsync(owner, id))!.Entries);
    }

    [Fact]
    public async Task Put_win_sets_status_won()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        var win = new WinDto("Rower", 1000m, DateOnly.Parse("2026-12-01"), false);
        var res = await c.PutAsJsonAsync($"/api/contests/{id}/win", win, JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var got = await GetAsync(c, id);
        Assert.Equal(ContestStatus.Won, got!.Status);
        Assert.Equal(win with { Steps = null }, got.Win! with { Steps = null });

        var update = win with { PrizeWon = "Hulajnoga", LaureateDataSent = true };
        Assert.Equal(HttpStatusCode.NoContent, (await c.PutAsJsonAsync($"/api/contests/{id}/win", update, JsonConfig.Options)).StatusCode);
        Assert.Equal(update with { Steps = null }, (await GetAsync(c, id))!.Win! with { Steps = null });
    }

    [Fact]
    public async Task Invalid_win_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        var empty = await c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto(" ", null, null, false), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        var neg = await c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("X", -1m, null, false), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, neg.StatusCode);
        Assert.Null((await GetAsync(c, id))!.Win);
    }

    [Fact]
    public async Task Delete_win_removes_it_resets_won_status_and_is_idempotent()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/contests/{id}/win")).StatusCode);
        await c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Rower", null, null, false), JsonConfig.Options);

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/contests/{id}/win")).StatusCode);
        var got = await GetAsync(c, id);
        Assert.Null(got!.Win);
        Assert.Equal(ContestStatus.Submitted, got.Status);
        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/contests/{id}/win")).StatusCode);
    }

    [Fact]
    public async Task Delete_win_leaves_non_won_status_untouched()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Rower", null, null, false), JsonConfig.Options);
        var dto = await GetAsync(c, id);
        Assert.Equal(ContestStatus.Won, dto!.Status);
        // user manually moved it to another status while keeping the win
        var put = await c.PutAsJsonAsync($"/api/contests/{id}", Samples.Contest(status: ContestStatus.Bought), JsonConfig.Options);
        put.EnsureSuccessStatusCode();
        await c.DeleteAsync($"/api/contests/{id}/win");
        Assert.Equal(ContestStatus.Bought, (await GetAsync(c, id))!.Status);
    }

    [Fact]
    public async Task Win_on_other_users_contest_returns_404_for_put_and_delete()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        await owner.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Rower", null, null, false), JsonConfig.Options);

        var other = await factory.CreateUserClientAsync();
        var put = await other.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Hack", null, null, false), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NotFound, put.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/contests/{id}/win")).StatusCode);
        Assert.Equal("Rower", (await GetAsync(owner, id))!.Win!.PrizeWon);
    }
}
