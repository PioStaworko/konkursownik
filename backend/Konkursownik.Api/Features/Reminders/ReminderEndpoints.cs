using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Reminders;

public static class ReminderEndpoints
{
    /// <summary>Computed "urgent" reminders; the passed group already carries RequireAuthorization.</summary>
    public static void MapReminderEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapGet("/reminders", async (HttpContext http, AppDbContext db, TimeProvider time) =>
        {
            var userId = http.User.UserId();
            var today = time.TodayInPoland();
            var contests = await db.Contests.AsNoTracking()
                .AsSplitQuery()
                .Include(c => c.Entries)
                .Include(c => c.Purchases)
                .Include(c => c.Proofs)
                .Include(c => c.Win).ThenInclude(w => w!.Steps)
                .Where(c => c.OwnerId == userId)
                .ToListAsync();
            var byId = contests.ToDictionary(c => c.Id);
            return ReminderRules.For(contests, today).Select(r => ReminderMapping.ToDto(r, byId[r.ContestId], today)).ToList();
        });
    }
}
