using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Reminders;

public enum ReminderKind { EndingSoon, Ended, ResultsDue, LaureateDeadline, ProofDisposable }

public record Reminder(ReminderKind Kind, Guid ContestId, string ContestName, DateOnly DueDate, Guid? ItemId, string? ItemText);

public static class ReminderRules
{
    public static IReadOnlyList<Reminder> For(IEnumerable<Contest> contests, DateOnly today)
    {
        var result = new List<Reminder>();
        foreach (var c in contests)
        {
            Reminder Make(ReminderKind kind, DateOnly due, ProofItem? proof = null) =>
                new(kind, c.Id, c.Name, due, proof?.Id, proof?.What);

            if (c.Status is ContestStatus.Planned or ContestStatus.Bought)
            {
                if (c.EndDate < today) result.Add(Make(ReminderKind.Ended, c.EndDate));
                else if (c.EndDate <= today.AddDays(3)) result.Add(Make(ReminderKind.EndingSoon, c.EndDate));
            }

            if (ContestRules.EffectiveStatus(c, today) is ContestStatus.Submitted or ContestStatus.AwaitingResults
                && c.ResultsDate is { } results && results <= today)
                result.Add(Make(ReminderKind.ResultsDue, results));

            if (ContestRules.HasPendingLaureate(c) && c.Win!.LaureateDeadline!.Value <= today.AddDays(7))
                result.Add(Make(ReminderKind.LaureateDeadline, c.Win.LaureateDeadline.Value));

            foreach (var p in c.Proofs)
                if (!p.Discarded && p.KeepUntil is { } keep && keep < today)
                    result.Add(Make(ReminderKind.ProofDisposable, keep, p));
        }

        return result.OrderBy(r => r.DueDate).ThenBy(r => r.Kind).ToList();
    }
}
