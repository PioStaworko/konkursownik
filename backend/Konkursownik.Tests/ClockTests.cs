using Konkursownik.Api.Common;
using Microsoft.Extensions.Time.Testing;

namespace Konkursownik.Tests;

public class ClockTests
{
    [Fact]
    public void TodayInPoland_after_midnight_local_is_next_day()
    {
        var tp = new FakeTimeProvider(new DateTimeOffset(2026, 11, 12, 23, 30, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 11, 13), tp.TodayInPoland());
    }

    [Fact]
    public void TodayInPoland_summer_time()
    {
        var tp = new FakeTimeProvider(new DateTimeOffset(2026, 7, 1, 21, 59, 0, TimeSpan.Zero));
        Assert.Equal(new DateOnly(2026, 7, 1), tp.TodayInPoland());
    }
}
