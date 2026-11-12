using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.ShoppingList;

public static class ShoppingListEndpoints
{
    public static void MapShoppingListEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapGet("/shopping-list", async (HttpContext http, AppDbContext db, TimeProvider time) =>
        {
            var userId = http.User.UserId();
            var contests = await db.Contests.AsNoTracking()
                .Include(c => c.Purchases)
                .Include(c => c.Win)
                .Where(c => c.OwnerId == userId)
                .ToListAsync();
            return ShoppingListBuilder.Build(contests, time.TodayInPoland());
        });
    }
}
