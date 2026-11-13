using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Proofs;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ProofEndpointTests(ApiFactory factory)
{
    private static Task<List<ProofListItemDto>?> ListAsync(HttpClient c) =>
        c.GetFromJsonAsync<List<ProofListItemDto>>("/api/proofs", JsonConfig.Options);

    [Fact]
    public async Task Proofs_lists_non_discarded_from_archived_too()
    {
        var c = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(c, Samples.Contest(name: "Aktywny", proofs:
        [
            new ProofDto(null, "Paragon", null, "Segregator", false, "ważne"),
            new ProofDto(null, "Wyrzucony", null, null, true, null),
        ]) with { Icon = "redeem" });
        await Samples.CreateContestAsync(c, Samples.Contest(name: "Archiwum", status: ContestStatus.Lost,
            proofs: [new ProofDto(null, "Bilet", null, null, false, null)]));

        var list = (await ListAsync(c))!;

        Assert.Equal(["Bilet", "Paragon"], list.Select(p => p.What).Order());
        var paragon = list.Single(p => p.What == "Paragon");
        Assert.Equal("Aktywny", paragon.ContestName);
        Assert.Equal("redeem", paragon.ContestIcon);
        Assert.Equal("Segregator", paragon.Location);
        Assert.Equal("ważne", paragon.Note);
    }

    [Fact]
    public async Task Proofs_sorted_keep_until_nulls_last()
    {
        var c = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(c, Samples.Contest(name: "B", proofs:
        [
            new ProofDto(null, "bez-daty-B", null, null, false, null),
            new ProofDto(null, "późno", new DateOnly(2027, 5, 1), null, false, null),
            new ProofDto(null, "wcześnie", new DateOnly(2027, 1, 1), null, false, null),
        ]));
        await Samples.CreateContestAsync(c, Samples.Contest(name: "A", proofs:
            [new ProofDto(null, "bez-daty-A", null, null, false, null)]));

        var list = (await ListAsync(c))!;

        Assert.Equal(["wcześnie", "późno", "bez-daty-A", "bez-daty-B"], list.Select(p => p.What));
    }

    [Fact]
    public async Task Proofs_only_own()
    {
        var c = await factory.CreateUserClientAsync();
        var other = await factory.CreateUserClientAsync();
        await Samples.CreateContestAsync(c, Samples.Contest(proofs: [new ProofDto(null, "Mój", null, null, false, null)]));
        await Samples.CreateContestAsync(other, Samples.Contest(proofs: [new ProofDto(null, "Cudzy", null, null, false, null)]));

        Assert.Equal(["Mój"], (await ListAsync(c))!.Select(p => p.What));
    }
}
