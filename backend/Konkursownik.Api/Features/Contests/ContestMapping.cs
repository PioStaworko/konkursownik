using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Contests;

public static class ContestMapping
{
    public static ContestDto ToDto(Contest c, DateOnly today) => new(
        c.Id, c.Name, c.Organizer, c.Url, c.RulesUrl, c.Type,
        c.PrizeDescription, c.PrizeValue, c.PrizeCount,
        c.StartDate, c.EndDate, c.ResultsDate, c.ResultsCheckNote,
        c.EntryLimitPerDay, c.EntryLimitTotal, c.Status, c.Notes, c.Icon,
        c.Tasks.OrderBy(t => t.Order).Select(t => new TaskDto(t.Id, t.Text, t.Done)).ToList(),
        c.Purchases.OrderBy(p => p.Order).Select(p => new PurchaseDto(p.Id, p.Product, p.Store, p.Quantity, p.Bought, p.Note)).ToList(),
        c.Proofs.OrderBy(p => p.Order).Select(p => new ProofDto(p.Id, p.What, p.KeepUntil, p.Location, p.Discarded, p.Note)).ToList(),
        ContestRules.EffectiveStatus(c, today),
        c.Entries.OrderByDescending(e => e.Date).Select(ToDto).ToList(),
        c.Win is null ? null : new WinDto(c.Win.PrizeWon, c.Win.PrizeValue, c.Win.LaureateDeadline, c.Win.LaureateDataSent),
        ContestRules.EntriesOn(c, today));

    private static EntryDto ToDto(Entry e) => new(
        e.Id, e.Date, e.ConfirmationCode, e.ReceiptNumber, e.PurchaseAmount, e.ContactUsed, e.AnswerText,
        e.Photos.Select(p => p.Id).ToList());

    public static ContestSummaryDto ToSummary(Contest c, DateOnly today) => new(
        c.Id, c.Name, c.EndDate, c.ResultsDate, c.Status, ContestRules.EffectiveStatus(c, today),
        c.Entries.Count, c.EntryLimitTotal);

    /// <summary>
    /// Copies scalar fields and replaces child lists. A child Id is honoured only when it is already
    /// a child of this contest; any other Id is treated as a new child with a fresh Id.
    /// </summary>
    public static void Apply(Contest c, ContestUpsertDto d)
    {
        c.Name = d.Name.Trim();
        c.Organizer = d.Organizer;
        c.Url = d.Url;
        c.RulesUrl = d.RulesUrl;
        c.Type = d.Type;
        c.PrizeDescription = d.PrizeDescription;
        c.PrizeValue = d.PrizeValue;
        c.PrizeCount = d.PrizeCount;
        c.StartDate = d.StartDate;
        c.EndDate = d.EndDate;
        c.ResultsDate = d.ResultsDate;
        c.ResultsCheckNote = d.ResultsCheckNote;
        c.EntryLimitPerDay = d.EntryLimitPerDay;
        c.EntryLimitTotal = d.EntryLimitTotal;
        c.Status = d.Status;
        c.Notes = d.Notes;
        c.Icon = d.Icon;

        var tasks = c.Tasks.ToDictionary(x => x.Id);
        c.Tasks = d.Tasks.Select((dto, i) =>
        {
            var x = dto.Id is { } id && tasks.TryGetValue(id, out var f) ? f : new ContestTask { ContestId = c.Id };
            x.Text = dto.Text; x.Done = dto.Done; x.Order = i;
            return x;
        }).ToList();

        var purchases = c.Purchases.ToDictionary(x => x.Id);
        c.Purchases = d.Purchases.Select((dto, i) =>
        {
            var x = dto.Id is { } id && purchases.TryGetValue(id, out var f) ? f : new PurchaseItem { ContestId = c.Id };
            x.Product = dto.Product; x.Store = dto.Store; x.Quantity = dto.Quantity; x.Bought = dto.Bought; x.Note = dto.Note; x.Order = i;
            return x;
        }).ToList();

        var proofs = c.Proofs.ToDictionary(x => x.Id);
        c.Proofs = d.Proofs.Select((dto, i) =>
        {
            var x = dto.Id is { } id && proofs.TryGetValue(id, out var f) ? f : new ProofItem { ContestId = c.Id };
            x.What = dto.What; x.KeepUntil = dto.KeepUntil; x.Location = dto.Location; x.Discarded = dto.Discarded; x.Note = dto.Note; x.Order = i;
            return x;
        }).ToList();
    }
}
