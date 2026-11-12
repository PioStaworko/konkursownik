using System.Globalization;
using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.ShoppingList;

public record ShoppingItemDto(Guid Id, Guid ContestId, string ContestName, string Product, string? Quantity);
public record ShoppingGroupDto(string Store, List<ShoppingItemDto> Items);

public static class ShoppingListBuilder
{
    public const string AnyStore = "Dowolny sklep";

    private static readonly StringComparer PolishOrder =
        StringComparer.Create(CultureInfo.GetCultureInfo("pl-PL"), ignoreCase: true);

    public static List<ShoppingGroupDto> Build(IEnumerable<Contest> contests, DateOnly today)
    {
        var rows = contests
            .Where(c => !ContestRules.IsArchived(c) && c.EndDate >= today)
            .OrderBy(c => c.EndDate)
            .SelectMany(c => c.Purchases.Where(p => !p.Bought).OrderBy(p => p.Order).Select(p => (Contest: c, Item: p)));

        var groups = new Dictionary<string, ShoppingGroupDto>();
        foreach (var (contest, item) in rows)
        {
            var store = item.Store?.Trim() ?? "";
            var key = store.ToLowerInvariant();
            if (!groups.TryGetValue(key, out var group))
                groups[key] = group = new ShoppingGroupDto(store.Length == 0 ? AnyStore : store, []);
            group.Items.Add(new ShoppingItemDto(item.Id, contest.Id, contest.Name, item.Product, item.Quantity));
        }

        return groups
            .OrderBy(g => g.Key.Length == 0)
            .ThenBy(g => g.Value.Store, PolishOrder)
            .Select(g => g.Value)
            .ToList();
    }
}
