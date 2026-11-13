using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;

namespace Konkursownik.Api.Features.Reminders;

/// <summary>Kind-specific fields are filled only for their own kind; otherwise empty list / null.</summary>
public record ReminderDto(
    ReminderKind Kind, DateOnly DueDate, Guid? ItemId, string? ItemText, ContestCardDto Contest,
    List<string> ConfirmationCodes, List<WinStepDto> WinSteps, string? ProofLocation, string? ProofNote,
    List<OpenPurchaseDto> BoughtPurchases);

public static class ReminderMapping
{
    public static ReminderDto ToDto(Reminder r, Contest c, DateOnly today)
    {
        var proof = r.Kind == ReminderKind.ProofDisposable ? c.Proofs.FirstOrDefault(p => p.Id == r.ItemId) : null;
        return new ReminderDto(
            r.Kind, r.DueDate, r.ItemId, r.ItemText, ContestCards.Build(c, today),
            // Entry has no creation timestamp, so ties on Date keep the order EF returned them in (OrderBy is stable).
            r.Kind == ReminderKind.ResultsDue
                ? c.Entries.OrderBy(e => e.Date).Select(e => e.ConfirmationCode)
                    .Where(code => !string.IsNullOrWhiteSpace(code)).Select(code => code!).ToList()
                : [],
            r.Kind == ReminderKind.LaureateDeadline && c.Win is not null
                ? c.Win.Steps.OrderBy(s => s.Order).Select(s => new WinStepDto(s.Id, s.Text, s.Done)).ToList()
                : [],
            proof?.Location, proof?.Note,
            r.Kind is ReminderKind.EndingSoon or ReminderKind.Ended
                ? c.Purchases.OrderBy(p => p.Order).Where(p => p.Bought).Select(ContestCards.ToOpen).ToList()
                : []);
    }
}
