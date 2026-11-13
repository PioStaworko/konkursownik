using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ContestExtensionsTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static ContestUpsertDto WithExtras(string? icon = "coffee", string? note = "Weź paragon papierowy", string? proofNote = "Nie wyrzucać folii") =>
        Samples.Contest(
            purchases: [("Mleko", "Biedronka")],
            proofs: [new ProofDto(null, "Paragon", null, null, false, proofNote)]) with
        {
            Icon = icon,
            Purchases = [new PurchaseDto(null, "Mleko", "Biedronka", null, false, note)],
        };

    [Fact]
    public async Task Icon_and_notes_roundtrip()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, WithExtras());

        var got = (await GetAsync(c, id))!;
        Assert.Equal("coffee", got.Icon);
        Assert.Equal("Weź paragon papierowy", got.Purchases[0].Note);
        Assert.Equal("Nie wyrzucać folii", got.Proofs[0].Note);
    }

    [Fact]
    public async Task Unknown_icon_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        var res = await c.PostAsJsonAsync("/api/contests", WithExtras(icon: "rocket"), JsonConfig.Options);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("Icon", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Note_over_300_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        var res = await c.PostAsJsonAsync("/api/contests", WithExtras(note: new string('x', 301)), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);

        var res2 = await c.PostAsJsonAsync("/api/contests", WithExtras(proofNote: new string('x', 301)), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.BadRequest, res2.StatusCode);
    }

    [Fact]
    public async Task Patch_status_changes_only_status()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, WithExtras());

        var res = await c.PatchAsJsonAsync($"/api/contests/{id}/status", new StatusDto(ContestStatus.Bought), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var got = (await GetAsync(c, id))!;
        Assert.Equal(ContestStatus.Bought, got.Status);
        Assert.Equal("Test", got.Name);
        Assert.Equal("coffee", got.Icon);
        Assert.Equal("Mleko", Assert.Single(got.Purchases).Product);
    }

    [Fact]
    public async Task Patch_status_other_user_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        var other = await factory.CreateUserClientAsync();

        var res = await other.PatchAsJsonAsync($"/api/contests/{id}/status", new StatusDto(ContestStatus.Won), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal(ContestStatus.Planned, (await GetAsync(owner, id))!.Status);
    }

    [Fact]
    public async Task Duplicate_copies_icon_and_notes()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, WithExtras());

        var res = await c.PostAsync($"/api/contests/{id}/duplicate", null);
        var newId = (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;

        var copy = (await GetAsync(c, newId))!;
        Assert.Equal("coffee", copy.Icon);
        Assert.Equal("Weź paragon papierowy", copy.Purchases[0].Note);
        Assert.Equal("Nie wyrzucać folii", copy.Proofs[0].Note);
    }
}
