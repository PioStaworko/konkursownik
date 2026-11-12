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
            var contests = await db.Contests.AsNoTracking()
                .Include(c => c.Proofs)
                .Include(c => c.Win)
                .Where(c => c.OwnerId == userId)
                .ToListAsync();
            return ReminderRules.For(contests, time.TodayInPoland());
        });
    }
}
