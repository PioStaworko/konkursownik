using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

public class BootstrapTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Bootstrap_code_works_once_only_when_no_users()
    {
        var c1 = factory.CreateClient();
        var r1 = await c1.PostAsJsonAsync("/api/auth/register", new RegisterRequest("a@x.pl", "Haslo123!", "START"));
        Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
        var r2 = await factory.CreateClient().PostAsJsonAsync("/api/auth/register", new RegisterRequest("b@x.pl", "Haslo123!", "START"));
        Assert.Equal(HttpStatusCode.BadRequest, r2.StatusCode);
    }
}
