using Konkursownik.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace Konkursownik.Api.Features.Auth;

public static class AdminSeeder
{
    public const string RoleName = "Admin";

    /// <summary>
    /// Ensures the Admin role exists and the account configured in Admin:UserName / Admin:Password
    /// is an administrator. An existing account keeps its password. Never logs the password.
    /// </summary>
    public static async Task EnsureAdminAsync(IServiceProvider sp, IConfiguration cfg, ILogger log)
    {
        var roles = sp.GetRequiredService<RoleManager<IdentityRole>>();
        var users = sp.GetRequiredService<UserManager<AppUser>>();

        if (!await roles.RoleExistsAsync(RoleName))
            Require(await roles.CreateAsync(new IdentityRole(RoleName)), "Nie udało się utworzyć roli Admin");

        var userName = (cfg["Admin:UserName"] ?? "").Trim();
        if (userName.Length == 0)
        {
            log.LogWarning("Admin:UserName is not set - no administrator account is configured, so nobody can create invites.");
            return;
        }

        var user = await users.FindByNameAsync(userName);
        if (user is null)
        {
            var password = cfg["Admin:Password"] ?? "";
            if (password.Length < 8)
                throw new InvalidOperationException("Admin:Password musi mieć co najmniej 8 znaków (konto administratora nie zostanie utworzone).");
            user = new AppUser { UserName = userName };
            Require(await users.CreateAsync(user, password), $"Nie udało się utworzyć konta administratora '{userName}'");
            log.LogInformation("Created administrator account {UserName}.", userName);
        }

        if (!await users.IsInRoleAsync(user, RoleName))
            Require(await users.AddToRoleAsync(user, RoleName), $"Nie udało się nadać roli Admin kontu '{userName}'");
    }

    private static void Require(IdentityResult result, string message)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException($"{message}: {string.Join("; ", result.Errors.Select(e => e.Description))}");
    }
}
