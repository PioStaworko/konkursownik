using System.Security.Claims;

namespace Konkursownik.Api.Common;

public static class UserExtensions
{
    public static string UserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Authenticated user has no NameIdentifier claim.");
}
