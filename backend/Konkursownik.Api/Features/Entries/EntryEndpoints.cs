using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Photos;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Entries;

public static class EntryEndpoints
{
    /// <summary>Entries and win; the passed group already carries RequireAuthorization.</summary>
    public static void MapEntryEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapPost("/contests/{id:guid}/entries", async (Guid id, EntryUpsertDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            if (!await db.Contests.AnyAsync(c => c.Id == id && c.OwnerId == userId)) return Results.NotFound();

            var errors = EntryValidation.Validate(dto);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var entry = new Entry { ContestId = id };
            Apply(entry, dto);
            db.Entries.Add(entry);
            await db.SaveChangesAsync();
            return Results.Created($"/api/entries/{entry.Id}", new IdDto(entry.Id));
        });

        secured.MapPut("/entries/{id:guid}", async (Guid id, EntryUpsertDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var entry = await db.Entries.FirstOrDefaultAsync(e => e.Id == id && e.Contest.OwnerId == userId);
            if (entry is null) return Results.NotFound();

            var errors = EntryValidation.Validate(dto);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            Apply(entry, dto);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        secured.MapDelete("/entries/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IPhotoStorage storage, ILogger<IPhotoStorage> log) =>
        {
            var userId = http.User.UserId();
            var keys = await PhotoEndpoints.KeysAsync(db, userId, entryId: id);
            var deleted = await db.Entries.Where(e => e.Id == id && e.Contest.OwnerId == userId).ExecuteDeleteAsync();
            if (deleted == 0) return Results.NotFound();
            await PhotoEndpoints.DeleteFilesAsync(storage, log, keys);
            return Results.NoContent();
        });

        secured.MapPut("/contests/{id:guid}/win", async (Guid id, WinDto dto, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            var contest = await db.Contests.Include(c => c.Win).ThenInclude(w => w!.Steps)
                .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId);
            if (contest is null) return Results.NotFound();

            var errors = EntryValidation.Validate(dto);
            if (errors.Count > 0) return Results.ValidationProblem(errors);

            var win = contest.Win;
            if (win is null)
            {
                win = new Win { ContestId = id };
                db.Wins.Add(win);
            }
            win.PrizeWon = dto.PrizeWon.Trim();
            win.PrizeValue = dto.PrizeValue;
            win.LaureateDeadline = dto.LaureateDeadline;
            win.LaureateDataSent = dto.LaureateDataSent;
            if (dto.Steps is not null) ContestMapping.ApplySteps(win, dto.Steps);
            contest.Status = ContestStatus.Won;
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        secured.MapDelete("/contests/{id:guid}/win", async (Guid id, HttpContext http, AppDbContext db) =>
        {
            var userId = http.User.UserId();
            if (!await db.Contests.AnyAsync(c => c.Id == id && c.OwnerId == userId)) return Results.NotFound();
            await db.Wins.Where(w => w.ContestId == id).ExecuteDeleteAsync();
            await db.Contests.Where(c => c.Id == id && c.OwnerId == userId && c.Status == ContestStatus.Won)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, ContestStatus.Submitted));
            return Results.NoContent();
        });
    }

    private static void Apply(Entry e, EntryUpsertDto d)
    {
        e.Date = d.Date;
        e.ConfirmationCode = d.ConfirmationCode;
        e.ReceiptNumber = d.ReceiptNumber;
        e.PurchaseAmount = d.PurchaseAmount;
        e.ContactUsed = d.ContactUsed;
        e.AnswerText = d.AnswerText;
        e.Store = d.Store;
    }
}
