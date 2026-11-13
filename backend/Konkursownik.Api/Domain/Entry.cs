namespace Konkursownik.Api.Domain;

public class Entry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public Contest Contest { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string? ConfirmationCode { get; set; }
    public string? ReceiptNumber { get; set; }
    public decimal? PurchaseAmount { get; set; }
    public string? ContactUsed { get; set; }
    public string? AnswerText { get; set; }
    public string? Store { get; set; }

    public List<Photo> Photos { get; set; } = new();
}

public class Photo
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EntryId { get; set; }
    public string StorageKey { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTimeOffset UploadedAt { get; set; }
    public PhotoLabel Label { get; set; } = PhotoLabel.Receipt;
}
