namespace Konkursownik.Api.Domain;

public class InviteCode
{
    public required string Code { get; set; }
    public string? CreatedByUserId { get; set; }
    public string? UsedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
}
