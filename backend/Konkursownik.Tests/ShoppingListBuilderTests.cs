using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.ShoppingList;

namespace Konkursownik.Tests;

public class ShoppingListBuilderTests
{
    private static readonly DateOnly Today = new(2026, 11, 12);

    private static Contest C(string name, ContestStatus status = ContestStatus.Planned, string end = "2026-11-30",
        params (string Product, string? Store, bool Bought)[] items)
    {
        var c = new Contest { Name = name, Status = status, EndDate = DateOnly.Parse(end) };
        c.Purchases = items.Select((p, i) => new PurchaseItem
        {
            ContestId = c.Id, Product = p.Product, Store = p.Store, Bought = p.Bought, Order = i,
        }).ToList();
        return c;
    }

    [Fact]
    public void Same_store_different_spelling_grouped()
    {
        var result = ShoppingListBuilder.Build(
            [C("A", items: [("Mleko", " Biedronka ", false), ("Chleb", "biedronka", false)])], Today);

        var group = Assert.Single(result);
        Assert.Equal("Biedronka", group.Store);
        Assert.Equal(2, group.Items.Count);
    }

    [Fact]
    public void Missing_store_goes_to_last_group_dowolny_sklep()
    {
        var result = ShoppingListBuilder.Build(
            [C("A", items: [("Mleko", null, false), ("Chleb", "  ", false), ("Ser", "Żabka", false)])], Today);

        Assert.Equal(["Żabka", "Dowolny sklep"], result.Select(g => g.Store));
        Assert.Equal(2, result[1].Items.Count);
    }

    [Fact]
    public void Excludes_bought_archived_and_ended_contests()
    {
        var result = ShoppingListBuilder.Build(
        [
            C("Active", items: [("Kupiony", "Lidl", true), ("Do kupienia", "Lidl", false)]),
            C("Archived", ContestStatus.Archived, items: [("X", "Lidl", false)]),
            C("Ended", end: "2026-11-11", items: [("Y", "Lidl", false)]),
            C("EndsToday", end: "2026-11-12", items: [("Z", "Lidl", false)]),
        ], Today);

        var group = Assert.Single(result);
        Assert.Equal(["Do kupienia", "Z"], group.Items.Select(i => i.Product).Order());
    }

    [Fact]
    public void Groups_sorted_alphabetically_polish()
    {
        var result = ShoppingListBuilder.Build(
            [C("A", items: [("a", "Żabka", false), ("b", "Lidl", false), ("c", "Auchan", false), ("d", null, false)])], Today);

        Assert.Equal(["Auchan", "Lidl", "Żabka", "Dowolny sklep"], result.Select(g => g.Store));
    }
}
