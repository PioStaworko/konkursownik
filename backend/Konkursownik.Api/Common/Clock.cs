namespace Konkursownik.Api.Common;

public static class Clock
{
    private static readonly TimeZoneInfo Poland = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    /// <summary>Bieżąca data kalendarzowa w Polsce (strefa Europe/Warsaw).</summary>
    public static DateOnly TodayInPoland(this TimeProvider tp) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(tp.GetUtcNow(), Poland).DateTime);
}
