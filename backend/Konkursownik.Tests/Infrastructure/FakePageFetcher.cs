using Konkursownik.Api.Features.Ai;

namespace Konkursownik.Tests.Infrastructure;

/// <summary>Returns a canned page (or null = unreadable) and records the last requested URL.</summary>
public class FakePageFetcher : IPageFetcher
{
    public PageText? Result { get; set; }
    public Uri? LastUrl { get; set; }

    public Task<PageText?> FetchAsync(Uri url, CancellationToken ct)
    {
        LastUrl = url;
        return Task.FromResult(Result);
    }
}
