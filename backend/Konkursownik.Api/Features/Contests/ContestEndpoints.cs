using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Contests;

public static class ContestEndpoints
{
    /// <summary>Contest CRUD; the passed group already carries RequireAuthorization.</summary>
    public static void MapContestEndpoints(this IEndpointRouteBuilder secured)
    {
        var group = secured.MapGroup("/contests");

        group.MapGet("/", async (HttpContext http, AppDbContext db, TimeProvider time, string? view) =>
        {
            var userId = http.User.UserId();
            var today = time.TodayInPoland();
            var contests = await db.Contests.AsNoTracking()
                .Include(c => c.Entries)
                .Include(c => c.Win)
                .Where(c => c.OwnerId == userId)
                .ToListAsync();

            var archive = string.Equals(view, "archive", StringComparison.OrdinalIgnoreCase);
            var selected = contests.Where(c => ContestRules.IsArchived(c) == archive);
            var ordered = archive ? selected.OrderByDescending(c => c.EndDate) : selected.OrderBy(c => c.EndDate);
            return ordered.Select(c => ContestMapping.ToSummary(c, today)).ToList();
        });

        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, TimeProvider time) =>
        {
            var userId = http.User.UserId();
            var contest = await db.Contests.AsNoTracking().AsSplitQuery()
                .Include(c => c.Tasks)
                .Include(c => c.Purchases)
                .Include(c => c.Proofs)
                .Include(c => c.Entries).ThenInclude(e => e.Photos)
                .Include(c => c.Win)
                .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId);
            return contest is null ? Results.NotFound() : Results.Ok(ContestMapping.ToDto(contest, time.TodayInPoland()));
        });

        group.MapPost("/", async (ContestUpsertDto dto, HttpContext http, AppDbContext db, TimeProvider time) =>
        {
            var errors = ContestValidation.Validate(dto);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var contest = new Contest { OwnerId = http.User.UserId(), CreatedAt = time.GetUtcNow() };
            ContestMapping.Apply(contest, dto);
            db.Contests.Add(contest);
            await db.SaveChangesAsync();
            return Results.Created($"/api/contests/{contest.Id}", new IdDto(contest.Id));
        });

        group.MapPut("/{id:guid}", async (Guid id, ContestUpsertDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var contest = await db.Contests.AsSplitQuery()
                .Include(c => c.Tasks)
                .Include(c => c.Purchases)
                .Include(c => c.Proofs)
                .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId);
            if (contest is null) return Results.NotFound();

            var errors = ContestValidation.Validate(dto);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var oldTasks = contest.Tasks.ToList();
            var oldPurchases = contest.Purchases.ToList();
            var oldProofs = contest.Proofs.ToList();
            ContestMapping.Apply(contest, dto);
            db.Tasks.RemoveRange(oldTasks.Where(o => contest.Tasks.All(n => n.Id != o.Id)));
            db.Purchases.RemoveRange(oldPurchases.Where(o => contest.Purchases.All(n => n.Id != o.Id)));
            db.Proofs.RemoveRange(oldProofs.Where(o => contest.Proofs.All(n => n.Id != o.Id)));
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}", async (Guid id, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var deleted = await db.Contests.Where(c => c.Id == id && c.OwnerId == userId).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });
    }
}
