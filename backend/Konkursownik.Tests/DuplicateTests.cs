using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class DuplicateTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    [Fact]
    public async Task Duplicate_copies_lists_resets_flags_skips_entries_and_win()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(
            name: "Oryginał", status: ContestStatus.Submitted, tasks: ["Krok 1", "Krok 2"],
            purchases: [("Mleko", "Biedronka"), ("Chleb", null)],
            proofs: [new ProofDto(null, "Paragon", DateOnly.Parse("2027-01-01"), "Szuflada", false)]));
        var src = (await GetAsync(c, id))!;
        await c.PatchAsJsonAsync($"/api/contest-tasks/{src.Tasks[0].Id}", new ToggleDto(true), JsonConfig.Options);
        await c.PatchAsJsonAsync($"/api/purchase-items/{src.Purchases[0].Id}", new ToggleDto(true), JsonConfig.Options);
        await c.PatchAsJsonAsync($"/api/proof-items/{src.Proofs[0].Id}", new ToggleDto(true), JsonConfig.Options);
        (await c.PostAsJsonAsync($"/api/contests/{id}/entries",
            new EntryUpsertDto(DateOnly.Parse("2026-11-12"), "ABC", null, 5m, null, null), JsonConfig.Options)).EnsureSuccessStatusCode();
        (await c.PutAsJsonAsync($"/api/contests/{id}/win",
            new WinDto("Nagroda", 100m, null, false), JsonConfig.Options)).EnsureSuccessStatusCode();

        var res = await c.PostAsync($"/api/contests/{id}/duplicate", null);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var newId = (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
        Assert.NotEqual(id, newId);

        var copy = (await GetAsync(c, newId))!;
        Assert.Equal("Oryginał (kopia)", copy.Name);
        Assert.Equal(ContestStatus.Planned, copy.Status);
        Assert.Empty(copy.Entries);
        Assert.Null(copy.Win);
        Assert.Equal(["Krok 1", "Krok 2"], copy.Tasks.Select(t => t.Text));
        Assert.All(copy.Tasks, t => Assert.False(t.Done));
        Assert.Equal(["Mleko", "Chleb"], copy.Purchases.Select(p => p.Product));
        Assert.Equal("Biedronka", copy.Purchases[0].Store);
        Assert.All(copy.Purchases, p => Assert.False(p.Bought));
        var proof = Assert.Single(copy.Proofs);
        Assert.Equal("Szuflada", proof.Location);
        Assert.Equal(DateOnly.Parse("2027-01-01"), proof.KeepUntil);
        Assert.False(proof.Discarded);
        Assert.Empty(copy.Tasks.Select(t => t.Id).Intersect(src.Tasks.Select(t => t.Id)));
        Assert.Empty(copy.Purchases.Select(t => t.Id).Intersect(src.Purchases.Select(t => t.Id)));
        Assert.Empty(copy.Proofs.Select(t => t.Id).Intersect(src.Proofs.Select(t => t.Id)));

        var original = (await GetAsync(c, id))!;
        Assert.True(original.Tasks[0].Done);
        Assert.Single(original.Entries);
    }

    [Fact]
    public async Task Duplicate_other_users_contest_returns_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        var other = await factory.CreateUserClientAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsync($"/api/contests/{id}/duplicate", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsync($"/api/contests/{Guid.NewGuid()}/duplicate", null)).StatusCode);
    }
}
