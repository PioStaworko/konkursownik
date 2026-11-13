using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;

namespace Konkursownik.Tests;

[Collection("api")]
public class SpaFallbackTests(ApiFactory factory) : IDisposable
{
    private readonly string _webRoot = Directory.CreateTempSubdirectory("wwwroot-").FullName;

    public void Dispose() => Directory.Delete(_webRoot, recursive: true);

    private HttpClient CreateClientWithWebRoot()
    {
        File.WriteAllText(Path.Combine(_webRoot, "index.html"), "<html>spa-shell</html>");
        return factory.WithWebHostBuilder(b => b.UseWebRoot(_webRoot)).CreateClient();
    }

    [Fact]
    public async Task Unknown_api_path_returns_404_for_authenticated_user_not_index_html()
    {
        var client = CreateClientWithWebRoot();
        var code = await factory.CreateInviteCodeAsync();
        var register = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(ApiFactory.NewUserName(), "Haslo123!", code));
        register.EnsureSuccessStatusCode();

        var res = await client.GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.DoesNotContain("spa-shell", await res.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/login")]
    [InlineData("/konkursy/123/edycja")]
    public async Task Client_side_routes_serve_index_html(string path)
    {
        var res = await CreateClientWithWebRoot().GetAsync(path);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Contains("spa-shell", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Static_assets_with_extension_are_served_not_replaced_by_index_html()
    {
        Directory.CreateDirectory(Path.Combine(_webRoot, "assets"));
        File.WriteAllText(Path.Combine(_webRoot, "assets", "app.js"), "console.log('asset');");

        var res = await CreateClientWithWebRoot().GetAsync("/assets/app.js");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Contains("console.log('asset');", await res.Content.ReadAsStringAsync());
        Assert.Contains("javascript", res.Content.Headers.ContentType!.MediaType);
    }
}
