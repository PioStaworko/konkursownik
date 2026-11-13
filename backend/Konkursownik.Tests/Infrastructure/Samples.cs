using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;

namespace Konkursownik.Tests.Infrastructure;

public static class Samples
{
    public static ContestUpsertDto Contest(
        string name = "Test",
        string start = "2026-11-01",
        string end = "2026-11-30",
        ContestStatus status = ContestStatus.Planned,
        string? resultsDate = null,
        string[]? tasks = null,
        (string Product, string? Store)[]? purchases = null,
        ProofDto[]? proofs = null) => new(
            Name: name,
            Organizer: null,
            Url: null,
            RulesUrl: null,
            Type: ContestType.Lottery,
            PrizeDescription: null,
            PrizeValue: null,
            PrizeCount: null,
            StartDate: DateOnly.Parse(start),
            EndDate: DateOnly.Parse(end),
            ResultsDate: resultsDate is null ? null : DateOnly.Parse(resultsDate),
            ResultsCheckNote: null,
            EntryLimitPerDay: null,
            EntryLimitTotal: null,
            Status: status,
            Notes: null,
            Icon: null,
            Tasks: (tasks ?? []).Select(t => new TaskDto(null, t, false)).ToList(),
            Purchases: (purchases ?? []).Select(p => new PurchaseDto(null, p.Product, p.Store, null, false, null)).ToList(),
            Proofs: (proofs ?? []).ToList());

    public static async Task<Guid> CreateContestAsync(HttpClient c, ContestUpsertDto d)
    {
        var res = await c.PostAsJsonAsync("/api/contests", d, JsonConfig.Options);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
    }
}
