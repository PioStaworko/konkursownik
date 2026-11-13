using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ContestCardsTests(ApiFactory factory)
{
    private static readonly DateOnly Today = new(2026, 11, 12);

    private static PurchaseItem P(string product, int order, bool bought = false, string? store = null) =>
        new() { Product = product, Order = order, Bought = bought, Store = store };

    [Fact]
    public void Build_counts_purchases_and_first_open()
    {
        var c = new Contest
        {
            Purchases = [P("Trzeci", 2), P("Pierwszy", 0, bought: true), P("Drugi", 1, store: "Lidl")],
        };
        c.Purchases[2].Quantity = "2 szt."; c.Purchases[2].Note = "promocja";

        var card = ContestCards.Build(c, Today);

        Assert.Equal(3, card.PurchasesTotal);
        Assert.Equal(1, card.PurchasesBought);
        Assert.Equal(new OpenPurchaseDto("Drugi", "2 szt.", "Lidl", "promocja"), card.FirstOpenPurchase);
    }

    [Fact]
    public void Build_stores_distinct_trimmed()
    {
        var c = new Contest { Purchases = [P("a", 0, store: " Biedronka "), P("b", 1, store: "Biedronka"), P("c", 2), P("d", 3, store: "  ")] };

        Assert.Equal(["Biedronka"], ContestCards.Build(c, Today).Stores);
    }

    [Fact]
    public void Build_first_proof_location_skips_discarded()
    {
        var c = new Contest
        {
            Proofs =
            [
                new ProofItem { What = "x", Order = 0, Location = "Szuflada", Discarded = true },
                new ProofItem { What = "y", Order = 1, Location = "" },
                new ProofItem { What = "z", Order = 3, Location = "Segregator" },
                new ProofItem { What = "w", Order = 2, Location = "Pudełko" },
            ],
        };

        Assert.Equal("Pudełko", ContestCards.Build(c, Today).FirstProofLocation);
    }

    [Fact]
    public void Top_prize_is_highest_value_then_first()
    {
        var c = new Contest
        {
            Prizes =
            [
                new ContestPrize { Name = "B", Value = 100m, Order = 1 },
                new ContestPrize { Name = "A", Value = 100m, Order = 0 },
                new ContestPrize { Name = "C", Value = 50m, Order = 2 },
            ],
        };
        var card = ContestCards.Build(c, Today);
        Assert.Equal("A", card.TopPrize!.Name);
        Assert.Equal(3, card.PrizesCount);

        var noValues = new Contest { Prizes = [new ContestPrize { Name = "Y", Order = 1 }, new ContestPrize { Name = "X", Order = 0 }] };
        Assert.Equal("X", ContestCards.Build(noValues, Today).TopPrize!.Name);

        var none = ContestCards.Build(new Contest(), Today);
        Assert.Null(none.TopPrize);
        Assert.Equal(0, none.PrizesCount);
    }

    [Fact]
    public void Build_win_steps_progress()
    {
        var c = new Contest
        {
            Win = new Win
            {
                PrizeWon = "Rower", PrizeValue = 1000m, LaureateDeadline = new DateOnly(2026, 11, 20),
                Steps = [new WinStep { Text = "a", Done = true }, new WinStep { Text = "b" }, new WinStep { Text = "c", Done = true }],
            },
        };

        var win = ContestCards.Build(c, Today).Win!;

        Assert.Equal(new CardWinDto("Rower", 1000m, new DateOnly(2026, 11, 20), false, 2, 3), win);
        Assert.Null(ContestCards.Build(new Contest(), Today).Win);
    }

    [Fact]
    public async Task List_returns_cards_only_own()
    {
        var a = await factory.CreateUserClientAsync();
        var b = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(a, Samples.Contest(name: "Mój", purchases: [("Mleko", " Żabka ")]));
        await Samples.CreateContestAsync(b, Samples.Contest(name: "Cudzy"));

        var mine = await a.GetFromJsonAsync<List<ContestCardDto>>("/api/contests", JsonConfig.Options);

        var card = Assert.Single(mine!);
        Assert.Equal(id, card.Id);
        Assert.Equal("Mój", card.Name);
        Assert.Equal(1, card.PurchasesTotal);
        Assert.Equal(["Żabka"], card.Stores);
        Assert.Equal("Mleko", card.FirstOpenPurchase!.Product);
    }
}
