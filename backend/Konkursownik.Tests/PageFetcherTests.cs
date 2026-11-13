using Microsoft.AspNetCore.Hosting;
using System.Net;
using Konkursownik.Api.Features.Ai;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Konkursownik.Tests;

public class PageFetcherTests : IAsyncLifetime
{
    private static readonly string Filler = string.Join(' ', Enumerable.Repeat("Konkurs z nagrodami do wygrania w sklepie.", 12));
    private WebApplication _app = null!;
    private string _baseUrl = "";

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        _app = builder.Build();
        _app.MapGet("/page", () => Results.Content(
            "<html><head><title> Wielki &amp; Konkurs </title><style>.x{color:red}</style></head>\n" +
            "<body><script>alert('secret-script')</script><noscript>no-js-text</noscript>\n" +
            "<h1>Zasady</h1><p>Wygraj &quot;nagrody&quot; &lt;teraz&gt;</p><p>" + Filler + "</p>\n" +
            "<a href=\"/files/Regulamin-konkursu.html\">r</a><a href='https://x.test/a.PDF'>pdf</a>\n" +
            "<a href=\"https://x.test/a.PDF\">dup</a><a href=\"/about\">no</a><a href=\"mailto:a@b.pl?x=regulamin\">m</a></body></html>",
            "text/html; charset=utf-8"));
        _app.MapGet("/huge", () => Results.Content("<p>" + new string('a', 2 * 1024 * 1024 + 10) + "</p>", "text/html"));
        _app.MapGet("/short", () => Results.Content("<p>krótko</p>", "text/html"));
        _app.MapGet("/to-page", () => Results.Redirect("/page"));
        _app.MapGet("/to-private", () => Results.Redirect("http://[::1]:1/secret"));
        await _app.StartAsync();
        _baseUrl = _app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.First();
    }

    public async Task DisposeAsync() => await _app.DisposeAsync();

    private static readonly Func<IPAddress, bool> OnlyV4Loopback = ip => ip.Equals(IPAddress.Loopback);

    [Fact]
    public async Task Fetcher_blocks_private_address()
    {
        using var fetcher = new PageFetcher();
        Assert.Null(await fetcher.FetchAsync(new Uri(_baseUrl + "/page"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_blocks_redirect_to_private()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);
        Assert.Null(await fetcher.FetchAsync(new Uri(_baseUrl + "/to-private"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_follows_redirect_to_allowed_host()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);
        Assert.NotNull(await fetcher.FetchAsync(new Uri(_baseUrl + "/to-page"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_rejects_over_2mb()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);
        Assert.Null(await fetcher.FetchAsync(new Uri(_baseUrl + "/huge"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_returns_null_for_short_text()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);
        Assert.Null(await fetcher.FetchAsync(new Uri(_baseUrl + "/short"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_rejects_non_http_scheme()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);
        Assert.Null(await fetcher.FetchAsync(new Uri("ftp://127.0.0.1/x"), CancellationToken.None));
    }

    [Fact]
    public async Task Fetcher_strips_html_and_finds_regulamin_link()
    {
        using var fetcher = new PageFetcher(OnlyV4Loopback);

        var page = await fetcher.FetchAsync(new Uri(_baseUrl + "/page"), CancellationToken.None);

        Assert.NotNull(page);
        Assert.Equal("Wielki & Konkurs", page.Title);
        Assert.Contains("Wygraj \"nagrody\" <teraz>", page.Text);
        Assert.DoesNotContain("secret-script", page.Text);
        Assert.DoesNotContain("no-js-text", page.Text);
        Assert.DoesNotContain("color:red", page.Text);
        Assert.DoesNotContain("<h1>", page.Text);
        Assert.DoesNotContain("  ", page.Text);
        Assert.Equal([_baseUrl + "/files/Regulamin-konkursu.html", "https://x.test/a.PDF"], page.Links);
    }
}
