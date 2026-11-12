using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Stats;

public record StatsDto(int Contests, int Entries, int Wins, decimal TotalSpent, decimal TotalWonValue);

public static class StatsEndpoints
{
    public static void MapStatsEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapGet("/stats", async (HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var contests = await db.Contests.CountAsync(c => c.OwnerId == userId);
            var entries = db.Entries.Where(e => e.Contest.OwnerId == userId);
            var wins = db.Wins.Where(w => db.Contests.Any(c => c.Id == w.ContestId && c.OwnerId == userId));
            return new StatsDto(
                contests,
                await entries.CountAsync(),
                await wins.CountAsync(),
                await entries.SumAsync(e => e.PurchaseAmount) ?? 0m,
                await wins.SumAsync(w => w.PrizeValue) ?? 0m);
        });
    }
}
