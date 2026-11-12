namespace Konkursownik.Api.Features.Auth;

public record RegisterRequest(string Email, string Password, string InviteCode);
public record LoginRequest(string Email, string Password);
public record MeDto(string Email);
public record InviteDto(string Code, DateTimeOffset CreatedAt, bool Used);
