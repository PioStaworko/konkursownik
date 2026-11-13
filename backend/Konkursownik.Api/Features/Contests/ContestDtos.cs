using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Contests;

public record TaskDto(Guid? Id, string Text, bool Done);
public record PurchaseDto(Guid? Id, string Product, string? Store, string? Quantity, bool Bought, string? Note);
public record ProofDto(Guid? Id, string What, DateOnly? KeepUntil, string? Location, bool Discarded, string? Note);

public record ContestUpsertDto(
    string Name, string? Organizer, string? Url, string? RulesUrl, ContestType Type,
    string? PrizeDescription, decimal? PrizeValue, int? PrizeCount,
    DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, string? ResultsCheckNote,
    int? EntryLimitPerDay, int? EntryLimitTotal, ContestStatus Status, string? Notes, string? Icon,
    List<TaskDto> Tasks, List<PurchaseDto> Purchases, List<ProofDto> Proofs);

public record PhotoDto(Guid Id, PhotoLabel Label, long SizeBytes);

public record EntryDto(
    Guid Id, DateOnly Date, string? ConfirmationCode, string? ReceiptNumber,
    decimal? PurchaseAmount, string? ContactUsed, string? AnswerText, string? Store, List<PhotoDto> Photos);

public record WinDto(string PrizeWon, decimal? PrizeValue, DateOnly? LaureateDeadline, bool LaureateDataSent);

public record ContestDto(
    Guid Id,
    string Name, string? Organizer, string? Url, string? RulesUrl, ContestType Type,
    string? PrizeDescription, decimal? PrizeValue, int? PrizeCount,
    DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, string? ResultsCheckNote,
    int? EntryLimitPerDay, int? EntryLimitTotal, ContestStatus Status, string? Notes, string? Icon,
    List<TaskDto> Tasks, List<PurchaseDto> Purchases, List<ProofDto> Proofs,
    ContestStatus EffectiveStatus, List<EntryDto> Entries, WinDto? Win, int EntriesToday);

public record ContestSummaryDto(
    Guid Id, string Name, DateOnly EndDate, DateOnly? ResultsDate,
    ContestStatus Status, ContestStatus EffectiveStatus, int EntryCount, int? EntryLimitTotal);

public record StatusDto(ContestStatus Status);

public record IdDto(Guid Id);
