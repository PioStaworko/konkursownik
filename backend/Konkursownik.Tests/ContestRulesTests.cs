using Konkursownik.Api.Domain;

namespace Konkursownik.Tests;

public class ContestRulesTests
{
    private static Contest C(ContestStatus status, string end = "2026-11-12", Win? win = null) => new()
    {
        OwnerId = "u1",
        Name = "Test",
        Type = ContestType.Lottery,
        StartDate = DateOnly.Parse("2026-11-01"),
        EndDate = DateOnly.Parse(end),
        Status = status,
        Win = win,
    };

    [Theory]
    [InlineData(ContestStatus.Submitted, "2026-11-12", ContestStatus.Submitted)]
    [InlineData(ContestStatus.Submitted, "2026-11-13", ContestStatus.AwaitingResults)]
    [InlineData(ContestStatus.Bought, "2026-11-13", ContestStatus.Bought)]
    [InlineData(ContestStatus.Won, "2026-12-01", ContestStatus.Won)]
    public void EffectiveStatus(ContestStatus stored, string today, ContestStatus expected)
        => Assert.Equal(expected, ContestRules.EffectiveStatus(C(stored, end: "2026-11-12"), DateOnly.Parse(today)));

    [Fact]
    public void Won_with_pending_laureate_is_not_archived()
    {
        var win = new Win { PrizeWon = "Nagroda", LaureateDeadline = DateOnly.Parse("2026-11-20"), LaureateDataSent = false };
        var c = C(ContestStatus.Won, win: win);
        Assert.True(ContestRules.HasPendingLaureate(c));
        Assert.False(ContestRules.IsArchived(c));
        win.LaureateDataSent = true;
        Assert.True(ContestRules.IsArchived(c));
    }

    [Fact]
    public void Won_without_deadline_is_archived()
    {
        var c = C(ContestStatus.Won, win: new Win { PrizeWon = "Nagroda" });
        Assert.True(ContestRules.IsArchived(c));
    }

    [Fact]
    public void Lost_and_Archived_are_archived_Planned_is_not()
    {
        Assert.True(ContestRules.IsArchived(C(ContestStatus.Lost)));
        Assert.True(ContestRules.IsArchived(C(ContestStatus.Archived)));
        Assert.False(ContestRules.IsArchived(C(ContestStatus.Planned)));
    }

    [Fact]
    public void EntriesOn_counts_only_that_day()
    {
        var c = C(ContestStatus.Submitted);
        c.Entries.Add(new Entry { Date = DateOnly.Parse("2026-11-05") });
        c.Entries.Add(new Entry { Date = DateOnly.Parse("2026-11-05") });
        c.Entries.Add(new Entry { Date = DateOnly.Parse("2026-11-06") });
        Assert.Equal(2, ContestRules.EntriesOn(c, DateOnly.Parse("2026-11-05")));
        Assert.Equal(0, ContestRules.EntriesOn(c, DateOnly.Parse("2026-11-07")));
    }
}
