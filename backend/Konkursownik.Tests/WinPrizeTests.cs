using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class WinPrizeTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static Task<HttpResponseMessage> PutWin(HttpClient c, Guid id, Guid? prizeId) =>
        c.PutAsJsonAsync($"/api/contests/{id}/win",
            new WinDto("Rower", 2500m, null, false, null, prizeId), JsonConfig.Options);

    private static async Task<(Guid Id, ContestDto Contest)> CreateAsync(HttpClient c)
    {
        var id = await Samples.CreateContestAsync(c, Samples.Contest(prizes:
        [
            new PrizeDto(null, "Samochód", 120000m, 1),
            new PrizeDto(null, "Rower", 2500m, 10),
        ]));
        return (id, (await GetAsync(c, id))!);
    }

    [Fact]
    public async Task Put_win_with_prize_of_this_contest()
    {
        var c = await factory.CreateUserClientAsync();
        var (id, contest) = await CreateAsync(c);
        var prizeId = contest.Prizes[1].Id;

        Assert.Equal(HttpStatusCode.NoContent, (await PutWin(c, id, prizeId)).StatusCode);

        Assert.Equal(prizeId, (await GetAsync(c, id))!.Win!.PrizeId);
    }

    [Fact]
    public async Task Put_win_with_foreign_prize_400()
    {
        var c = await factory.CreateUserClientAsync();
        var (id, _) = await CreateAsync(c);
        var (_, other) = await CreateAsync(c);

        var res = await PutWin(c, id, other.Prizes[0].Id);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("invalid_prize", await res.Content.ReadAsStringAsync());
        Assert.Null((await GetAsync(c, id))!.Win);
    }

    [Fact]
    public async Task Removing_won_prize_nulls_prize_id_keeps_text()
    {
        var c = await factory.CreateUserClientAsync();
        var (id, contest) = await CreateAsync(c);
        await PutWin(c, id, contest.Prizes[1].Id);

        var update = Samples.Contest(prizes: [new PrizeDto(contest.Prizes[0].Id, "Samochód", 120000m, 1)]);
        Assert.Equal(HttpStatusCode.NoContent,
            (await c.PutAsJsonAsync($"/api/contests/{id}", update, JsonConfig.Options)).StatusCode);

        var win = (await GetAsync(c, id))!.Win!;
        Assert.Null(win.PrizeId);
        Assert.Equal("Rower", win.PrizeWon);
        Assert.Equal(2500m, win.PrizeValue);
    }
}
