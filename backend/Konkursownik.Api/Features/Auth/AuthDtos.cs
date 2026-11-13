namespace Konkursownik.Api.Features.Auth;

public record RegisterRequest(string UserName, string Password, string InviteCode);
public record LoginRequest(string UserName, string Password);
public record MeDto(string UserName, bool IsAdmin);
public record InviteDto(string Code, DateTimeOffset CreatedAt, bool Used);
