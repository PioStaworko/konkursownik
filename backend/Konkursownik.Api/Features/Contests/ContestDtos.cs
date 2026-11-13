using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Contests;

public record TaskDto(Guid? Id, string Text, bool Done);
public record PurchaseDto(Guid? Id, string Product, string? Store, string? Quantity, bool Bought, string? Note);
public record ProofDto(Guid? Id, string What, DateOnly? KeepUntil, string? Location, bool Discarded, string? Note);

public record PrizeDto(Guid? Id, string Name, decimal? Value, int? Count);

public record ContestUpsertDto(
    string Name, string? Organizer, string? Url, string? RulesUrl, ContestType Type,
    DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, string? ResultsCheckNote,
    int? EntryLimitPerDay, int? EntryLimitTotal, ContestStatus Status, string? Notes, string? Icon,
    List<TaskDto> Tasks, List<PurchaseDto> Purchases, List<ProofDto> Proofs, List<PrizeDto> Prizes);

public record PhotoDto(Guid Id, PhotoLabel Label, long SizeBytes);

public record EntryDto(
    Guid Id, DateOnly Date, string? ConfirmationCode, string? ReceiptNumber,
    decimal? PurchaseAmount, string? ContactUsed, string? AnswerText, string? Store, List<PhotoDto> Photos);

public record WinStepDto(Guid? Id, string Text, bool Done);

public record WinDto(
    string PrizeWon, decimal? PrizeValue, DateOnly? LaureateDeadline, bool LaureateDataSent,
    List<WinStepDto>? Steps = null, Guid? PrizeId = null);

public record ContestDto(
    Guid Id,
    string Name, string? Organizer, string? Url, string? RulesUrl, ContestType Type,
    DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, string? ResultsCheckNote,
    int? EntryLimitPerDay, int? EntryLimitTotal, ContestStatus Status, string? Notes, string? Icon,
    List<TaskDto> Tasks, List<PurchaseDto> Purchases, List<ProofDto> Proofs, List<PrizeDto> Prizes,
    ContestStatus EffectiveStatus, List<EntryDto> Entries, WinDto? Win, int EntriesToday);

public record OpenPurchaseDto(string Product, string? Quantity, string? Store, string? Note);

public record CardWinDto(
    string PrizeWon, decimal? PrizeValue, DateOnly? LaureateDeadline, bool LaureateDataSent,
    int StepsDone, int StepsTotal, Guid? PrizeId = null);

public record TopPrizeDto(string Name, decimal? Value, int? Count);

public record ContestCardDto(
    Guid Id, string Name, string? Organizer, string? Icon, ContestType Type,
    TopPrizeDto? TopPrize, int PrizesCount, DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate,
    ContestStatus Status, ContestStatus EffectiveStatus, int EntryCount, int EntriesToday,
    int? EntryLimitTotal, int? EntryLimitPerDay, string? Url, string? RulesUrl,
    int PurchasesTotal, int PurchasesBought, OpenPurchaseDto? FirstOpenPurchase, List<string> Stores,
    string? FirstProofLocation, CardWinDto? Win, DateTimeOffset CreatedAt);

public record StatusDto(ContestStatus Status);

public record IdDto(Guid Id);
