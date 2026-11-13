using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Contests;

/// <summary>Builds the list/reminder card from a contest loaded with entries, purchases, proofs and win steps.</summary>
public static class ContestCards
{
    public static ContestCardDto Build(Contest c, DateOnly today)
    {
        var purchases = c.Purchases.OrderBy(p => p.Order).ToList();
        var firstOpen = purchases.FirstOrDefault(p => !p.Bought);
        var stores = purchases
            .Select(p => p.Store?.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .Select(s => s!)
            .DistinctBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();
        var proofLocation = c.Proofs.OrderBy(p => p.Order)
            .FirstOrDefault(p => !p.Discarded && !string.IsNullOrWhiteSpace(p.Location))?.Location;

        var topPrize = c.Prizes.OrderBy(p => p.Order).MaxBy(p => p.Value ?? decimal.MinValue);

        return new ContestCardDto(
            c.Id, c.Name, c.Organizer, c.Icon, c.Type,
            topPrize is null ? null : new TopPrizeDto(topPrize.Name, topPrize.Value, topPrize.Count), c.Prizes.Count, c.StartDate, c.EndDate, c.ResultsDate,
            c.Status, ContestRules.EffectiveStatus(c, today), c.Entries.Count, ContestRules.EntriesOn(c, today),
            c.EntryLimitTotal, c.EntryLimitPerDay, c.Url, c.RulesUrl,
            purchases.Count, purchases.Count(p => p.Bought),
            firstOpen is null ? null : ToOpen(firstOpen), stores,
            proofLocation,
            c.Win is null ? null : new CardWinDto(
                c.Win.PrizeWon, c.Win.PrizeValue, c.Win.LaureateDeadline, c.Win.LaureateDataSent,
                c.Win.Steps.Count(s => s.Done), c.Win.Steps.Count, c.Win.PrizeId),
            c.CreatedAt);
    }

    public static OpenPurchaseDto ToOpen(PurchaseItem p) => new(p.Product, p.Quantity, p.Store, p.Note);
}
