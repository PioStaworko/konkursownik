using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ItemToggleTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static Task<HttpResponseMessage> Patch(HttpClient c, string url, bool value) =>
        c.PatchAsJsonAsync(url, new ToggleDto(value), JsonConfig.Options);

    private static ContestUpsertDto WithItems() => Samples.Contest(
        tasks: ["Krok"], purchases: [("Produkt", null)], proofs: [new ProofDto(null, "Paragon", null, null, false)]);

    [Fact]
    public async Task Toggle_task_purchase_proof()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, WithItems());
        var g = (await GetAsync(c, id))!;

        Assert.Equal(HttpStatusCode.NoContent, (await Patch(c, $"/api/contest-tasks/{g.Tasks[0].Id}", true)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Patch(c, $"/api/purchase-items/{g.Purchases[0].Id}", true)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Patch(c, $"/api/proof-items/{g.Proofs[0].Id}", true)).StatusCode);

        var after = (await GetAsync(c, id))!;
        Assert.True(after.Tasks[0].Done);
        Assert.True(after.Purchases[0].Bought);
        Assert.True(after.Proofs[0].Discarded);

        Assert.Equal(HttpStatusCode.NoContent, (await Patch(c, $"/api/contest-tasks/{g.Tasks[0].Id}", false)).StatusCode);
        Assert.False((await GetAsync(c, id))!.Tasks[0].Done);
    }

    [Fact]
    public async Task Toggle_other_users_item_returns_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, WithItems());
        var g = (await GetAsync(owner, id))!;

        var other = await factory.CreateUserClientAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(other, $"/api/contest-tasks/{g.Tasks[0].Id}", true)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(other, $"/api/purchase-items/{g.Purchases[0].Id}", true)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(other, $"/api/proof-items/{g.Proofs[0].Id}", true)).StatusCode);

        var after = (await GetAsync(owner, id))!;
        Assert.False(after.Tasks[0].Done);
        Assert.False(after.Purchases[0].Bought);
        Assert.False(after.Proofs[0].Discarded);
    }

    [Fact]
    public async Task Toggle_unknown_item_returns_404()
    {
        var c = await factory.CreateUserClientAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await Patch(c, $"/api/contest-tasks/{Guid.NewGuid()}", true)).StatusCode);
    }
}
