using System.Text.RegularExpressions;
using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Auth;

public static class AuthEndpoints
{
    private static readonly Regex UserNameFormat = new(@"^[A-Za-z0-9._-]{3,32}$", RegexOptions.Compiled);

    /// <summary>Register and login: the only /api endpoints (besides health) open to anonymous callers.</summary>
    public static void MapPublicAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").AllowAnonymous();
        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
    }

    /// <summary>Endpoints for signed-in users; the passed group already carries RequireAuthorization.</summary>
    public static void MapAccountEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapPost("/auth/logout", async (SignInManager<AppUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        });

        secured.MapGet("/auth/me", async (HttpContext http, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(http.User);
            return user is null
                ? Results.Unauthorized()
                : Results.Ok(new MeDto(user.UserName!, http.User.IsInRole(AdminSeeder.RoleName)));
        });

        secured.MapPost("/invites", async (HttpContext http, AppDbContext db, TimeProvider time) =>
        {
            var invite = new InviteCode
            {
                Code = InviteCodeGenerator.New(),
                CreatedByUserId = http.User.UserId(),
                CreatedAt = time.GetUtcNow(),
            };
            db.InviteCodes.Add(invite);
            await db.SaveChangesAsync();
            return Results.Created($"/api/invites/{invite.Code}", ToDto(invite));
        }).RequireAuthorization(AdminSeeder.RoleName);

        secured.MapGet("/invites", async (HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var invites = await db.InviteCodes.AsNoTracking()
                .Where(i => i.CreatedByUserId == userId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
            return invites.Select(ToDto);
        }).RequireAuthorization(AdminSeeder.RoleName);
    }

    private static InviteDto ToDto(InviteCode i) => new(i.Code, i.CreatedAt, i.UsedAt is not null);

    private static async Task<IResult> Register(
        RegisterRequest request, AppDbContext db, UserManager<AppUser> users,
        SignInManager<AppUser> signIn, TimeProvider time)
    {
        var userName = (request.UserName ?? "").Trim();
        if (!UserNameFormat.IsMatch(userName))
            return Results.BadRequest(new { error = "invalid_username" });

        var code = (request.InviteCode ?? "").Trim().ToUpperInvariant();
        var invalidInvite = Results.BadRequest(new { error = "invalid_invite" });
        var usernameTaken = Results.BadRequest(new { error = "username_taken" });

        await using var tx = await db.Database.BeginTransactionAsync();

        // The invite is checked first so anonymous callers cannot probe which usernames exist.
        if (!await db.InviteCodes.AnyAsync(i => i.Code == code && i.UsedAt == null))
            return invalidInvite;

        // Identity's normalizer (upper-case) makes this lookup case-insensitive.
        if (await users.FindByNameAsync(userName) is not null)
            return usernameTaken;

        var user = new AppUser { UserName = userName };
        var created = await users.CreateAsync(user, request.Password ?? "");
        if (!created.Succeeded)
        {
            if (created.Errors.Any(e => e.Code == nameof(IdentityErrorDescriber.DuplicateUserName)))
                return usernameTaken; // lost a race against the unique index
            return Results.ValidationProblem(created.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));
        }

        // Atomic single-use claim: a concurrent registration with the same code updates 0 rows.
        var now = time.GetUtcNow();
        var claimed = await db.InviteCodes
            .Where(i => i.Code == code && i.UsedAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.UsedByUserId, user.Id)
                .SetProperty(i => i.UsedAt, now));
        if (claimed == 0)
            return invalidInvite; // tx disposed without commit -> user creation rolled back

        await tx.CommitAsync();
        await signIn.SignInAsync(user, isPersistent: true);
        return Results.Ok();
    }

    private static async Task<IResult> Login(LoginRequest request, SignInManager<AppUser> signIn)
    {
        var result = await signIn.PasswordSignInAsync(
            request.UserName ?? "", request.Password ?? "", isPersistent: true, lockoutOnFailure: true);
        return result.Succeeded ? Results.Ok() : Results.Unauthorized();
    }
}
