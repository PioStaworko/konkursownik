namespace Konkursownik.Api.Domain;

public class WinStep
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WinId { get; set; }
    public string Text { get; set; } = "";
    public bool Done { get; set; }
    public int Order { get; set; }
}
