namespace Konkursownik.Api.Domain;

public class Win
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ContestId { get; set; }
    public string PrizeWon { get; set; } = "";
    public decimal? PrizeValue { get; set; }
    public Guid? PrizeId { get; set; }
    public DateOnly? LaureateDeadline { get; set; }
    public bool LaureateDataSent { get; set; }
    public List<WinStep> Steps { get; set; } = [];
}
