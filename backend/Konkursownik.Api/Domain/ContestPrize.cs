namespace Konkursownik.Api.Domain;

public class ContestPrize
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public string Name { get; set; } = "";
    public decimal? Value { get; set; }
    public int? Count { get; set; }
    public int Order { get; set; }
}
