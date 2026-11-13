using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Proofs;

public record ProofListItemDto(
    Guid Id, Guid ContestId, string ContestName, string? ContestIcon, string What, DateOnly? KeepUntil, string? Location, string? Note);

public static class ProofEndpoints
{
    /// <summary>Proof "clipboard": non-discarded proofs across all of the user's contests, archived included.</summary>
    public static void MapProofEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapGet("/proofs", async (HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            return await db.Proofs.AsNoTracking()
                .Where(p => !p.Discarded)
                .Join(db.Contests.Where(c => c.OwnerId == userId), p => p.ContestId, c => c.Id, (p, c) => new { p, c })
                .OrderBy(x => x.p.KeepUntil == null)
                .ThenBy(x => x.p.KeepUntil)
                .ThenBy(x => x.c.Name)
                .Select(x => new ProofListItemDto(x.p.Id, x.c.Id, x.c.Name, x.c.Icon, x.p.What, x.p.KeepUntil, x.p.Location, x.p.Note))
                .ToListAsync();
        });
    }
}
