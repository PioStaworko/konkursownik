namespace Konkursownik.Api.Domain;

public class ContestTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public string Text { get; set; } = "";
    public bool Done { get; set; }
    public int Order { get; set; }
}

public class PurchaseItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public string Product { get; set; } = "";
    public string? Store { get; set; }
    public string? Quantity { get; set; }
    public bool Bought { get; set; }
    public string? Note { get; set; }
    public int Order { get; set; }
}

public class ProofItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public string What { get; set; } = "";
    public DateOnly? KeepUntil { get; set; }
    public string? Location { get; set; }
    public bool Discarded { get; set; }
    public string? Note { get; set; }
    public int Order { get; set; }
}
