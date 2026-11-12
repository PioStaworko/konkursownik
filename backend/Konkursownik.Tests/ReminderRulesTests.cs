using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Reminders;

namespace Konkursownik.Tests;

public class ReminderRulesTests
{
    private static readonly DateOnly Today = new(2026, 11, 12);

    private static Contest C(string end = "2026-11-30", ContestStatus status = ContestStatus.Planned,
        string? results = null, Win? win = null, params ProofItem[] proofs)
    {
        var c = new Contest
        {
            Name = "K",
            Status = status,
            StartDate = DateOnly.Parse("2026-11-01"),
            EndDate = DateOnly.Parse(end),
            ResultsDate = results is null ? null : DateOnly.Parse(results),
            Win = win,
        };
        c.Proofs.AddRange(proofs);
        return c;
    }

    private static IReadOnlyList<Reminder> Run(params Contest[] cs) => ReminderRules.For(cs, Today);

    [Theory] [InlineData("2026-11-12", true)] [InlineData("2026-11-15", true)] [InlineData("2026-11-16", false)]
    public void EndingSoon_window(string end, bool expected)
    {
        var r = Run(C(end));
        Assert.Equal(expected, r.Any(x => x.Kind == ReminderKind.EndingSoon));
        if (expected) Assert.Equal(DateOnly.Parse(end), r.Single().DueDate);
    }

    [Fact]
    public void EndingSoon_not_for_submitted() =>
        Assert.DoesNotContain(Run(C("2026-11-14", ContestStatus.Submitted)), x => x.Kind == ReminderKind.EndingSoon);

    [Fact]
    public void Ended_when_planned_or_bought_and_end_passed()
    {
        foreach (var s in new[] { ContestStatus.Planned, ContestStatus.Bought })
        {
            var r = Assert.Single(Run(C("2026-11-11", s)));
            Assert.Equal(ReminderKind.Ended, r.Kind);
            Assert.Equal(new DateOnly(2026, 11, 11), r.DueDate);
            Assert.Null(r.ItemId);
            Assert.Null(r.ItemText);
        }
    }

    [Theory] [InlineData("2026-11-12", true)] [InlineData("2026-11-01", true)] [InlineData("2026-11-13", false)]
    public void ResultsDue(string results, bool expected)
    {
        var r = Run(C("2026-11-05", ContestStatus.Submitted, results));
        Assert.Equal(expected, r.Any(x => x.Kind == ReminderKind.ResultsDue));
        if (expected) Assert.Equal(DateOnly.Parse(results), r.Single().DueDate);
    }

    [Fact]
    public void No_results_date_no_reminder_and_no_crash() =>
        Assert.Empty(Run(C("2026-11-05", ContestStatus.Submitted)));

    private static Win W(string? deadline, bool sent = false) =>
        new() { PrizeWon = "X", LaureateDeadline = deadline is null ? null : DateOnly.Parse(deadline), LaureateDataSent = sent };

    [Theory] [InlineData("2026-11-19", true)] [InlineData("2026-11-20", false)] [InlineData("2026-11-01", true)]
    public void LaureateDeadline_window(string deadline, bool expected)
    {
        var r = Run(C("2026-11-05", ContestStatus.Won, win: W(deadline)));
        Assert.Equal(expected, r.Any(x => x.Kind == ReminderKind.LaureateDeadline));
        if (expected) Assert.Equal(DateOnly.Parse(deadline), r.Single().DueDate);
    }

    [Fact]
    public void Laureate_sent_no_reminder() =>
        Assert.Empty(Run(C("2026-11-05", ContestStatus.Won, win: W("2026-11-13", sent: true))));

    private static ProofItem P(string? keepUntil, bool discarded = false) =>
        new() { What = "Paragon", KeepUntil = keepUntil is null ? null : DateOnly.Parse(keepUntil), Discarded = discarded };

    [Theory] [InlineData("2026-11-11", true)] [InlineData("2026-11-12", false)]
    public void ProofDisposable(string keepUntil, bool expected)
    {
        var proof = P(keepUntil);
        var r = Run(C(proofs: proof));
        Assert.Equal(expected, r.Any(x => x.Kind == ReminderKind.ProofDisposable));
        if (expected)
        {
            var rem = r.Single();
            Assert.Equal(proof.Id, rem.ItemId);
            Assert.Equal("Paragon", rem.ItemText);
            Assert.Equal(DateOnly.Parse(keepUntil), rem.DueDate);
        }
    }

    [Fact]
    public void Proof_discarded_or_without_date_no_reminder() =>
        Assert.Empty(Run(C(proofs: [P("2026-11-01", discarded: true), P(null)])));

    [Fact]
    public void Proof_in_archived_contest_still_reminds()
    {
        var r = Assert.Single(Run(C("2026-11-05", ContestStatus.Archived, proofs: P("2026-11-01"))));
        Assert.Equal(ReminderKind.ProofDisposable, r.Kind);
    }

    [Fact]
    public void Sorted_by_due_date()
    {
        var r = Run(
            C("2026-11-14"),
            C("2026-11-10"),
            C("2026-11-05", ContestStatus.Archived, proofs: P("2026-11-02")));
        Assert.Equal(
            [new DateOnly(2026, 11, 2), new DateOnly(2026, 11, 10), new DateOnly(2026, 11, 14)],
            r.Select(x => x.DueDate));
    }
}
