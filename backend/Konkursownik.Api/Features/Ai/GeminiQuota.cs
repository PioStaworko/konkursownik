using Microsoft.Extensions.Options;

namespace Konkursownik.Api.Features.Ai;

/// <summary>
/// Process-wide guard for the Gemini key: a sliding 60 s window of request and token budgets, plus a block
/// until the next midnight in the quota reset time zone after Gemini itself answered 429.
/// </summary>
public class GeminiQuota(IOptions<GeminiOptions> options, TimeProvider time)
{
    private static readonly TimeSpan Window = TimeSpan.FromSeconds(60);

    private readonly object _lock = new();
    private readonly List<(DateTimeOffset At, int Tokens, bool IsRequest)> _entries = [];
    private DateTimeOffset _blockedUntil = DateTimeOffset.MinValue;

    public bool IsBlocked => time.GetUtcNow() < _blockedUntil;

    public bool TryAcquire(int estimatedTokens)
    {
        var o = options.Value;
        lock (_lock)
        {
            var now = time.GetUtcNow();
            Prune(now);
            var requests = _entries.Count(e => e.IsRequest);
            var tokens = Math.Max(0, _entries.Sum(e => e.Tokens));
            if (requests + 1 > o.MaxRequestsPerMinute || tokens + estimatedTokens > o.MaxTokensPerMinute) return false;
            _entries.Add((now, estimatedTokens, true));
            return true;
        }
    }

    /// <summary>Replaces the estimate made in <see cref="TryAcquire"/> with the real token count.</summary>
    public void Record(int actualTokens, int estimatedTokens = 0)
    {
        lock (_lock) _entries.Add((time.GetUtcNow(), actualTokens - estimatedTokens, false));
    }

    public void BlockUntilNextReset()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.QuotaResetTimeZone);
        var now = time.GetUtcNow();
        var localMidnight = TimeZoneInfo.ConvertTime(now, zone).Date.AddDays(1);
        _blockedUntil = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localMidnight, zone), TimeSpan.Zero);
    }

    public void Unblock() => _blockedUntil = DateTimeOffset.MinValue;

    private void Prune(DateTimeOffset now) => _entries.RemoveAll(e => now - e.At >= Window);
}
