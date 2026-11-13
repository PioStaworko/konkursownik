using Microsoft.Extensions.Options;

namespace Konkursownik.Api.Features.Ai;

/// <summary>A slot taken in <see cref="GeminiQuota"/>; its token count is corrected in place by <see cref="GeminiQuota.Record"/>.</summary>
public sealed class QuotaReservation
{
    internal QuotaReservation(DateTimeOffset at, int tokens)
    {
        At = at;
        Tokens = tokens;
    }

    internal DateTimeOffset At { get; }
    internal int Tokens { get; set; }
}

/// <summary>
/// Process-wide guard for the Gemini key: a sliding 60 s window of request and token budgets, plus a block
/// until the next midnight in the quota reset time zone after Gemini itself answered 429.
/// </summary>
public class GeminiQuota(IOptions<GeminiOptions> options, TimeProvider time)
{
    private static readonly TimeSpan Window = TimeSpan.FromSeconds(60);

    private readonly object _lock = new();
    private readonly List<QuotaReservation> _entries = [];
    private DateTimeOffset _blockedUntil = DateTimeOffset.MinValue;

    public bool IsBlocked
    {
        get
        {
            lock (_lock) return time.GetUtcNow() < _blockedUntil;
        }
    }

    /// <summary>Takes a request slot and <paramref name="estimatedTokens"/> of budget; null when either budget is used up.</summary>
    public QuotaReservation? TryAcquire(int estimatedTokens)
    {
        var o = options.Value;
        lock (_lock)
        {
            var now = time.GetUtcNow();
            _entries.RemoveAll(e => now - e.At >= Window);
            var tokens = _entries.Sum(e => e.Tokens);
            if (_entries.Count + 1 > o.MaxRequestsPerMinute || tokens + estimatedTokens > o.MaxTokensPerMinute) return null;
            var reservation = new QuotaReservation(now, estimatedTokens);
            _entries.Add(reservation);
            return reservation;
        }
    }

    /// <summary>Replaces the estimate of <paramref name="reservation"/> with the real token count, keeping its timestamp.</summary>
    public void Record(QuotaReservation reservation, int actualTokens)
    {
        lock (_lock) reservation.Tokens = actualTokens;
    }

    public void BlockUntilNextReset()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.QuotaResetTimeZone);
        lock (_lock)
        {
            var localMidnight = TimeZoneInfo.ConvertTime(time.GetUtcNow(), zone).Date.AddDays(1);
            _blockedUntil = new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localMidnight, zone), TimeSpan.Zero);
        }
    }

    public void Unblock()
    {
        lock (_lock) _blockedUntil = DateTimeOffset.MinValue;
    }
}
