using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;

namespace Konkursownik.Api.Features.Ai;

public record PageText(string Title, string Text, List<string> Links);

public interface IPageFetcher
{
    /// <summary>Fetches a public web page as plain text; null when blocked, unreachable, too large or too short.</summary>
    Task<PageText?> FetchAsync(Uri url, CancellationToken ct);
}

/// <summary>
/// SSRF-safe page fetcher. The destination IP is checked inside the connect callback (after DNS resolution),
/// so DNS rebinding and redirects cannot reach non-public addresses.
/// </summary>
public sealed partial class PageFetcher : IPageFetcher, IDisposable
{
    private const int MaxBytes = 2 * 1024 * 1024;
    private const int MaxRedirects = 3;
    private const int MaxTextChars = 200_000;
    private const int MinTextChars = 200;
    private const int MaxLinks = 20;
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromSeconds(2);

    static PageFetcher() => Encoding.RegisterProvider(CodePagesEncodingProvider.Instance); // windows-1250, iso-8859-2 for Polish pages

    private readonly Func<IPAddress, bool> _isAllowed;
    private readonly HttpClient _http;

    public PageFetcher(Func<IPAddress, bool>? isAllowed = null)
    {
        _isAllowed = isAllowed ?? IpPolicy.IsPublic;
        _http = new HttpClient(new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            UseProxy = false, // a proxy would resolve and connect on our behalf, bypassing the IP policy
            UseCookies = false,
            AutomaticDecompression = DecompressionMethods.All,
            ConnectTimeout = TimeSpan.FromSeconds(5),
            ConnectCallback = ConnectAsync,
        }, disposeHandler: true) { Timeout = System.Threading.Timeout.InfiniteTimeSpan };
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("KonkursownikBot/1.0");
        _http.DefaultRequestHeaders.Accept.ParseAdd("text/html,text/plain;q=0.9,*/*;q=0.1");
    }

    public void Dispose() => _http.Dispose();

    private async ValueTask<Stream> ConnectAsync(SocketsHttpConnectionContext context, CancellationToken ct)
    {
        var host = context.DnsEndPoint.Host;
        var addresses = await Dns.GetHostAddressesAsync(host, ct);
        var allowed = addresses.Where(_isAllowed).ToList();
        if (allowed.Count == 0) throw new HttpRequestException("Destination address is not allowed.");

        Exception? last = null;
        foreach (var address in allowed)
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
            try
            {
                await socket.ConnectAsync(new IPEndPoint(address, context.DnsEndPoint.Port), ct);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                socket.Dispose();
                last = ex;
            }
        }
        throw new HttpRequestException("Could not connect.", last);
    }

    public async Task<PageText?> FetchAsync(Uri url, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(Timeout);
        try
        {
            var current = url;
            for (var hop = 0; hop <= MaxRedirects; hop++)
            {
                if (!IsFetchable(current)) return null;

                using var response = await _http.GetAsync(current, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                var status = (int)response.StatusCode;
                if (status is >= 300 and < 400)
                {
                    var location = response.Headers.Location;
                    if (location is null) return null;
                    current = location.IsAbsoluteUri ? location : new Uri(current, location);
                    continue;
                }
                if (!response.IsSuccessStatusCode) return null;

                var mediaType = response.Content.Headers.ContentType?.MediaType;
                if (mediaType is not null && !mediaType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
                    && !mediaType.Contains("html", StringComparison.OrdinalIgnoreCase)) return null;

                var html = await ReadBoundedAsync(response, cts.Token);
                return html is null ? null : ToPage(html, current);
            }
            return null; // too many redirects
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException or RegexMatchTimeoutException
                                       or UriFormatException or IOException or InvalidOperationException)
        {
            if (ct.IsCancellationRequested) throw;
            return null;
        }
    }

    internal static bool IsFetchable(Uri uri) =>
        uri.IsAbsoluteUri && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) && string.IsNullOrEmpty(uri.UserInfo);

    private static async Task<string?> ReadBoundedAsync(HttpResponseMessage response, CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        var buffer = new MemoryStream();
        var chunk = new byte[81920];
        while (true)
        {
            var read = await stream.ReadAsync(chunk, ct);
            if (read == 0) break;
            if (buffer.Length + read > MaxBytes) return null;
            buffer.Write(chunk, 0, read);
        }
        return DecodeBody(buffer.ToArray(), response.Content.Headers.ContentType?.CharSet);
    }

    private static string DecodeBody(byte[] bytes, string? charset)
    {
        charset = string.IsNullOrWhiteSpace(charset) ? SniffMetaCharset(bytes) : charset;
        Encoding encoding = Encoding.UTF8;
        if (!string.IsNullOrWhiteSpace(charset))
        {
            try { encoding = Encoding.GetEncoding(charset.Trim('"', '\'', ' ')); }
            catch (ArgumentException) { /* unknown charset: fall back to UTF-8 */ }
        }
        return encoding.GetString(bytes);
    }

    /// <summary>Finds a charset declared in a meta tag within the first 4 KB (ASCII-compatible scan).</summary>
    private static string? SniffMetaCharset(byte[] bytes)
    {
        var head = Encoding.Latin1.GetString(bytes, 0, Math.Min(bytes.Length, 4096));
        var m = MetaCharset().Match(head);
        return m.Success ? m.Groups[1].Value : null;
    }

    [GeneratedRegex(@"<meta\b[^>]*?charset\s*=\s*[""']?\s*([\w\-:.]+)", RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 2000)]
    private static partial Regex MetaCharset();

    private static PageText? ToPage(string html, Uri baseUri)
    {
        var title = Collapse(WebUtility.HtmlDecode(Title().Match(html) is { Success: true } m ? StripTags(m.Groups[1].Value) : ""));

        var cleaned = Comments().Replace(html, " ");
        cleaned = NonContent().Replace(cleaned, " ");
        var text = Collapse(WebUtility.HtmlDecode(StripTags(cleaned)));
        if (text.Length < MinTextChars) return null;
        if (text.Length > MaxTextChars) text = text[..MaxTextChars];

        return new PageText(title, text, FindLinks(html, baseUri));
    }

    private static string StripTags(string html) => Tags().Replace(html, " ");

    private static string Collapse(string s) => Whitespace().Replace(s, " ").Trim();

    private static List<string> FindLinks(string html, Uri baseUri)
    {
        var links = new List<string>();
        foreach (Match match in Href().Matches(html))
        {
            var raw = WebUtility.HtmlDecode(match.Groups[1].Success ? match.Groups[1].Value
                : match.Groups[2].Success ? match.Groups[2].Value : match.Groups[3].Value).Trim();
            if (raw.Length == 0 || !Uri.TryCreate(baseUri, raw, out var absolute) || !IsFetchable(absolute)) continue;

            var interesting = raw.Contains("regulamin", StringComparison.OrdinalIgnoreCase)
                || absolute.AbsolutePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase);
            if (!interesting) continue;

            var link = absolute.AbsoluteUri;
            if (!links.Contains(link)) links.Add(link);
            if (links.Count == MaxLinks) break;
        }
        return links;
    }

    [GeneratedRegex(@"<!--.*?-->", RegexOptions.Singleline, matchTimeoutMilliseconds: 2000)]
    private static partial Regex Comments();

    [GeneratedRegex(@"<(script|style|noscript)\b[^>]*>.*?</\1\s*>", RegexOptions.Singleline | RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 2000)]
    private static partial Regex NonContent();

    [GeneratedRegex(@"<[^>]*>", RegexOptions.Singleline, matchTimeoutMilliseconds: 2000)]
    private static partial Regex Tags();

    [GeneratedRegex(@"<title\b[^>]*>(.*?)</title\s*>", RegexOptions.Singleline | RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 2000)]
    private static partial Regex Title();

    [GeneratedRegex(@"\s+", RegexOptions.None, matchTimeoutMilliseconds: 2000)]
    private static partial Regex Whitespace();

    [GeneratedRegex(@"<a\b[^>]*?\bhref\s*=\s*(?:""([^""]*)""|'([^']*)'|([^\s>""']+))", RegexOptions.Singleline | RegexOptions.IgnoreCase, matchTimeoutMilliseconds: 2000)]
    private static partial Regex Href();
}
