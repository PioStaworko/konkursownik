using System.Security.Cryptography;

namespace Konkursownik.Api.Features.Auth;

public static class InviteCodeGenerator
{
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int Length = 8;

    public static string New() => RandomNumberGenerator.GetString(Alphabet, Length);
}
