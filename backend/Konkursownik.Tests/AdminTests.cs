using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Konkursownik.Tests;

[Collection("api")]
public class AdminTests(ApiFactory factory)
{
    private const string Password = ApiFactory.DefaultPassword;

    private static async Task<string?> ErrorOf(HttpResponseMessage res) =>
        (await res.Content.ReadFromJsonAsync<Dictionary<string, string>>())?.GetValueOrDefault("error");

    private async Task<HttpResponseMessage> RegisterAsync(string userName)
    {
        var code = await factory.CreateInviteCodeAsync();
        return await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(userName, Password, code));
    }

    [Fact]
    public async Task Admin_is_created_and_can_invite()
    {
        var client = factory.CreateClient();
        var login = await client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(ApiFactory.AdminUserName, ApiFactory.AdminPassword));
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me");
        Assert.True(me!.IsAdmin);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync("/api/invites", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/invites")).StatusCode);
    }

    [Fact]
    public async Task Existing_account_gets_admin_role_password_unchanged()
    {
        var name = ApiFactory.NewUserName();
        await factory.CreateUserClientAsync(name);

        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Admin:UserName"] = name.ToUpperInvariant(),
            ["Admin:Password"] = "ZupelnieInne123!",
        }).Build();
        using (var scope = factory.Services.CreateScope())
            await AdminSeeder.EnsureAdminAsync(scope.ServiceProvider, cfg, NullLogger.Instance);

        var wrong = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(name, "ZupelnieInne123!"));
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);

        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(name, Password))).StatusCode);
        Assert.True((await client.GetFromJsonAsync<MeDto>("/api/auth/me"))!.IsAdmin);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync("/api/invites", null)).StatusCode);
    }

    [Fact]
    public async Task Short_admin_password_fails_startup_clearly()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Admin:UserName"] = ApiFactory.NewUserName(),
            ["Admin:Password"] = "short",
        }).Build();
        using var scope = factory.Services.CreateScope();
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            AdminSeeder.EnsureAdminAsync(scope.ServiceProvider, cfg, NullLogger.Instance));
        Assert.Contains("Admin:Password", ex.Message);
    }

    [Fact]
    public async Task Non_admin_invites_403()
    {
        var client = await factory.CreateUserClientAsync();
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync("/api/invites", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/invites")).StatusCode);
        Assert.False((await client.GetFromJsonAsync<MeDto>("/api/auth/me"))!.IsAdmin);
    }

    private sealed class NoAdminFactory : ApiFactory
    {
        protected override bool ConfigureAdmin => false;
    }

    [Fact]
    public async Task No_admin_config_starts_and_nobody_can_invite()
    {
        await using var f = new NoAdminFactory();
        await f.InitializeAsync();
        var client = f.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);

        var res = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest("ktos", Password, ""));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("invalid_invite", await ErrorOf(res));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/invites", null)).StatusCode);
    }

    [Fact]
    public async Task Register_with_username_and_login()
    {
        var name = ApiFactory.NewUserName();
        Assert.Equal(HttpStatusCode.OK, (await RegisterAsync(name)).StatusCode);
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(name.ToUpperInvariant(), Password))).StatusCode);
    }

    [Fact]
    public async Task Username_rules()
    {
        foreach (var bad in new[] { "ab", "ma spacje", "a@b", new string('a', 33) })
        {
            var res = await RegisterAsync(bad);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            Assert.Equal("invalid_username", await ErrorOf(res));
        }

        var suffix = Guid.NewGuid().ToString("N")[..8];
        Assert.Equal(HttpStatusCode.OK, (await RegisterAsync("piotrek" + suffix)).StatusCode);
        var taken = await RegisterAsync("Piotrek" + suffix);
        Assert.Equal(HttpStatusCode.BadRequest, taken.StatusCode);
        Assert.Equal("username_taken", await ErrorOf(taken));
    }

    [Fact]
    public async Task Legacy_email_username_can_log_in()
    {
        var legacy = $"stary{Guid.NewGuid():N}@x.pl";
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
            var created = await users.CreateAsync(new AppUser { UserName = legacy, Email = legacy }, Password);
            Assert.True(created.Succeeded);
        }
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(legacy, Password));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Me_returns_username_and_is_admin()
    {
        var name = ApiFactory.NewUserName();
        var user = await factory.CreateUserClientAsync(name);
        var me = (await user.GetFromJsonAsync<MeDto>("/api/auth/me"))!;
        Assert.Equal(name, me.UserName);
        Assert.False(me.IsAdmin);

        var admin = (await (await factory.CreateAdminClientAsync()).GetFromJsonAsync<MeDto>("/api/auth/me"))!;
        Assert.Equal(ApiFactory.AdminUserName, admin.UserName);
        Assert.True(admin.IsAdmin);
    }
}
