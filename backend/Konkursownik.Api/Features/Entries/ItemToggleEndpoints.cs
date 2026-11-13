using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Entries;

public static class ItemToggleEndpoints
{
    /// <summary>Quick checkbox toggles; ownership is checked through the parent contest's OwnerId.</summary>
    public static void MapItemToggleEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapPatch("/contest-tasks/{id:guid}", async (Guid id, ToggleDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var n = await db.Tasks
                .Where(t => t.Id == id && db.Contests.Any(c => c.Id == t.ContestId && c.OwnerId == userId))
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.Done, dto.Value));
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });

        secured.MapPatch("/purchase-items/{id:guid}", async (Guid id, ToggleDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var n = await db.Purchases
                .Where(p => p.Id == id && db.Contests.Any(c => c.Id == p.ContestId && c.OwnerId == userId))
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Bought, dto.Value));
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });

        secured.MapPatch("/proof-items/{id:guid}", async (Guid id, ToggleDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var n = await db.Proofs
                .Where(p => p.Id == id && db.Contests.Any(c => c.Id == p.ContestId && c.OwnerId == userId))
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Discarded, dto.Value));
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });

        secured.MapPatch("/win-steps/{id:guid}", async (Guid id, ToggleDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var n = await db.WinSteps
                .Where(s => s.Id == id && db.Wins.Any(w => w.Id == s.WinId
                    && db.Contests.Any(c => c.Id == w.ContestId && c.OwnerId == userId)))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Done, dto.Value));
            return n == 0 ? Results.NotFound() : Results.NoContent();
        });
    }
}
