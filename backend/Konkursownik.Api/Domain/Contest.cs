namespace Konkursownik.Api.Domain;

public enum ContestType { Lottery, Creative }

public enum ContestStatus { Planned, Bought, Submitted, AwaitingResults, Won, Lost, Archived }

public class Contest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string OwnerId { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Organizer { get; set; }
    public string? Url { get; set; }
    public string? RulesUrl { get; set; }
    public ContestType Type { get; set; }
    public string? PrizeDescription { get; set; }
    public decimal? PrizeValue { get; set; }
    public int? PrizeCount { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateOnly? ResultsDate { get; set; }
    public string? ResultsCheckNote { get; set; }
    public int? EntryLimitPerDay { get; set; }
    public int? EntryLimitTotal { get; set; }
    public ContestStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public List<ContestTask> Tasks { get; set; } = new();
    public List<PurchaseItem> Purchases { get; set; } = new();
    public List<ProofItem> Proofs { get; set; } = new();
    public List<Entry> Entries { get; set; } = new();
    public Win? Win { get; set; }
}
