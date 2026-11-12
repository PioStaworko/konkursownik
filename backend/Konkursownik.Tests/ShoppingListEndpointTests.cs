using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.ShoppingList;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ShoppingListEndpointTests(ApiFactory factory)
{
    [Fact]
    public async Task Endpoint_returns_only_own_items_and_toggle_removes_item()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(name: "Mój", purchases: [("Mleko", "Biedronka")]));
        var other = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(other, Samples.Contest(name: "Cudzy", purchases: [("Cudze", "Biedronka")]));

        var list = (await c.GetFromJsonAsync<List<ShoppingGroupDto>>("/api/shopping-list", JsonConfig.Options))!;
        var item = Assert.Single(Assert.Single(list).Items);
        Assert.Equal("Mleko", item.Product);
        Assert.Equal("Mój", item.ContestName);
        Assert.Equal(id, item.ContestId);

        var patch = await c.PatchAsJsonAsync($"/api/purchase-items/{item.Id}", new ToggleDto(true), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, patch.StatusCode);

        var after = (await c.GetFromJsonAsync<List<ShoppingGroupDto>>("/api/shopping-list", JsonConfig.Options))!;
        Assert.Empty(after);
    }
}
