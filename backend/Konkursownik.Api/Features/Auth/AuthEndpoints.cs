using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Auth;

public static class AuthEndpoints
{
    private const long BootstrapLockKey = 7_301_001;

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
            return user is null ? Results.Unauthorized() : Results.Ok(new MeDto(user.Email!));
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
        });

        secured.MapGet("/invites", async (HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var invites = await db.InviteCodes.AsNoTracking()
                .Where(i => i.CreatedByUserId == userId)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
            return invites.Select(ToDto);
        });
    }

    private static InviteDto ToDto(InviteCode i) => new(i.Code, i.CreatedAt, i.UsedAt is not null);

    private static async Task<IResult> Register(
        RegisterRequest request, AppDbContext db, UserManager<AppUser> users,
        SignInManager<AppUser> signIn, IConfiguration config, TimeProvider time)
    {
        var code = (request.InviteCode ?? "").Trim().ToUpperInvariant();
        var bootstrap = (config["Invites:BootstrapCode"] ?? "").Trim().ToUpperInvariant();
        var invalidInvite = Results.BadRequest(new { error = "invalid_invite" });

        await using var tx = await db.Database.BeginTransactionAsync();

        // Bootstrap works only while there are no users; the lock serializes concurrent first registrations.
        var useBootstrap = false;
        if (bootstrap.Length > 0 && code == bootstrap)
        {
            await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({BootstrapLockKey})");
            useBootstrap = !await db.Users.AnyAsync();
        }

        if (!useBootstrap && !await db.InviteCodes.AnyAsync(i => i.Code == code && i.UsedAt == null))
            return invalidInvite;

        var user = new AppUser { UserName = request.Email, Email = request.Email };
        var created = await users.CreateAsync(user, request.Password ?? "");
        if (!created.Succeeded)
            return Results.ValidationProblem(created.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));

        if (!useBootstrap)
        {
            // Atomic single-use claim: a concurrent registration with the same code updates 0 rows.
            var now = time.GetUtcNow();
            var claimed = await db.InviteCodes
                .Where(i => i.Code == code && i.UsedAt == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(i => i.UsedByUserId, user.Id)
                    .SetProperty(i => i.UsedAt, now));
            if (claimed == 0)
                return invalidInvite; // tx disposed without commit -> user creation rolled back
        }

        await tx.CommitAsync();
        await signIn.SignInAsync(user, isPersistent: true);
        return Results.Ok();
    }

    private static async Task<IResult> Login(LoginRequest request, SignInManager<AppUser> signIn)
    {
        var result = await signIn.PasswordSignInAsync(
            request.Email ?? "", request.Password ?? "", isPersistent: true, lockoutOnFailure: true);
        return result.Succeeded ? Results.Ok() : Results.Unauthorized();
    }
}
