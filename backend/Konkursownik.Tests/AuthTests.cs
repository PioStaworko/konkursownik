using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class AuthTests(ApiFactory factory)
{
    private const string Password = ApiFactory.DefaultPassword;

    private static string NewName() => ApiFactory.NewUserName();

    [Fact]
    public async Task Invalid_invite_returns_400()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), Password, "ZZZZZZZZ"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.Equal("invalid_invite", body!["error"]);
    }

    [Fact]
    public async Task Invite_is_single_use()
    {
        var code = await factory.CreateInviteCodeAsync();
        var first = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), Password, code));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var second = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), Password, code));
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task Invite_code_is_matched_case_insensitively_after_trim()
    {
        var code = await factory.CreateInviteCodeAsync();
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), Password, "  " + code.ToLowerInvariant() + " "));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Register_logs_in_and_me_returns_username()
    {
        var name = NewName();
        var code = await factory.CreateInviteCodeAsync();
        var client = factory.CreateClient();
        var reg = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(name, Password, code));
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);
        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Equal(name, (await me.Content.ReadFromJsonAsync<MeDto>())!.UserName);
    }

    [Fact]
    public async Task Me_anonymous_returns_401()
    {
        var res = await factory.CreateClient().GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_wrong_password_returns_401()
    {
        var name = NewName();
        await factory.CreateUserClientAsync(name);
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest(name, "Zle12345!"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Login_correct_password_returns_200_and_logs_in()
    {
        var name = NewName();
        await factory.CreateUserClientAsync(name);
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(name, Password));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Logout_then_me_returns_401()
    {
        var client = await factory.CreateUserClientAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Short_password_returns_400()
    {
        var code = await factory.CreateInviteCodeAsync();
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), "abc1234", code));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Invites_list_shows_used_flag()
    {
        var owner = await factory.CreateAdminClientAsync();
        var create = await owner.PostAsync("/api/invites", null);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var invite = (await create.Content.ReadFromJsonAsync<InviteDto>())!;
        Assert.False(invite.Used);

        var before = (await owner.GetFromJsonAsync<InviteDto[]>("/api/invites"))!;
        Assert.False(before.Single(i => i.Code == invite.Code).Used);

        var reg = await factory.CreateClient().PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(NewName(), Password, invite.Code));
        Assert.Equal(HttpStatusCode.OK, reg.StatusCode);

        var after = (await owner.GetFromJsonAsync<InviteDto[]>("/api/invites"))!;
        Assert.True(after.Single(i => i.Code == invite.Code).Used);
    }

    [Fact]
    public async Task Invites_require_login()
    {
        var res = await factory.CreateClient().GetAsync("/api/invites");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
