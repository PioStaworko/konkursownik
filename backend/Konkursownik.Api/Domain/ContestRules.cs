namespace Konkursownik.Api.Domain;

public static class ContestRules
{
    public static ContestStatus EffectiveStatus(Contest c, DateOnly today)
        => c.Status == ContestStatus.Submitted && today > c.EndDate
            ? ContestStatus.AwaitingResults
            : c.Status;

    public static bool HasPendingLaureate(Contest c)
        => c.Win != null && c.Win.LaureateDeadline != null && !c.Win.LaureateDataSent;

    public static bool IsArchived(Contest c)
        => c.Status is ContestStatus.Archived or ContestStatus.Lost
           || (c.Status == ContestStatus.Won && !HasPendingLaureate(c));

    public static int EntriesOn(Contest c, DateOnly day)
        => c.Entries.Count(e => e.Date == day);
}
