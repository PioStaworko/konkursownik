using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Reminders;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class ReminderDtoTests(ApiFactory factory)
{
    private static Task<List<ReminderDto>?> RemindersAsync(HttpClient c) =>
        c.GetFromJsonAsync<List<ReminderDto>>("/api/reminders", JsonConfig.Options);

    [Fact]
    public async Task Reminders_results_due_has_confirmation_codes()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(
            start: "2026-11-01", end: "2026-11-10", status: ContestStatus.Submitted, resultsDate: "2026-11-11"));
        foreach (var (date, code) in new[] { ("2026-11-05", "B2"), ("2026-11-03", "A1"), ("2026-11-04", null), ("2026-11-05", "B3") })
            (await c.PostAsJsonAsync($"/api/contests/{id}/entries",
                new EntryUpsertDto(DateOnly.Parse(date), code, null, null, null, null, null), JsonConfig.Options)).EnsureSuccessStatusCode();

        var r = Assert.Single((await RemindersAsync(c))!);

        Assert.Equal(ReminderKind.ResultsDue, r.Kind);
        Assert.Equal(id, r.Contest.Id);
        Assert.Equal(4, r.Contest.EntryCount);
        Assert.Equal("A1", r.ConfirmationCodes[0]);
        Assert.Equal(["B2", "B3"], r.ConfirmationCodes.Skip(1).Order());
        Assert.Equal(3, r.ConfirmationCodes.Count);
        Assert.Empty(r.WinSteps);
        Assert.Empty(r.BoughtPurchases);
        Assert.Null(r.ProofLocation);
    }

    [Fact]
    public async Task Reminders_laureate_has_steps_and_proof_has_location()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(
            end: "2026-11-10", status: ContestStatus.Won,
            proofs: [new ProofDto(null, "Paragon", new DateOnly(2026, 11, 1), "Szuflada", false, "pod kalendarzem")]));
        (await c.PutAsJsonAsync($"/api/contests/{id}/win",
            new WinDto("Rower", null, new DateOnly(2026, 11, 15), false,
                [new WinStepDto(null, "Oświadczenie", true), new WinStepDto(null, "Skan", false)]), JsonConfig.Options)).EnsureSuccessStatusCode();

        var list = (await RemindersAsync(c))!;

        var laureate = Assert.Single(list, x => x.Kind == ReminderKind.LaureateDeadline);
        Assert.Equal(["Oświadczenie", "Skan"], laureate.WinSteps.Select(s => s.Text));
        Assert.Equal([true, false], laureate.WinSteps.Select(s => s.Done));
        Assert.Empty(laureate.ConfirmationCodes);
        Assert.Equal(2, laureate.Contest.Win!.StepsTotal);

        var proof = Assert.Single(list, x => x.Kind == ReminderKind.ProofDisposable);
        Assert.Equal("Szuflada", proof.ProofLocation);
        Assert.Equal("pod kalendarzem", proof.ProofNote);
        Assert.Equal("Paragon", proof.ItemText);
        Assert.Empty(proof.WinSteps);
    }
}
