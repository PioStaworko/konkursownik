using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Features.Photos;

public record PhotoLabelDto(PhotoLabel Label);

public static class PhotoEndpoints
{
    private const int MaxBytes = 10 * 1024 * 1024;
    private const long RequestLimit = 11 * 1024 * 1024;

    /// <summary>Private receipt/package photos; the passed group already carries RequireAuthorization.</summary>
    public static void MapPhotoEndpoints(this IEndpointRouteBuilder secured)
    {
        secured.MapPost("/entries/{id:guid}/photos", async (Guid id, IFormFile? file, HttpContext http,
                AppDbContext db, IPhotoStorage storage, TimeProvider time, CancellationToken ct) =>
            {
                var userId = http.User.UserId();
                if (!await db.Entries.AnyAsync(e => e.Id == id && e.Contest.OwnerId == userId, ct)) return Results.NotFound();
                if (file is null) return Results.BadRequest(new { error = "unsupported_type" });

                var rawLabel = http.Request.Form["label"].ToString();
                PhotoLabel label = PhotoLabel.Receipt;
                if (rawLabel != "" && !(Enum.TryParse(rawLabel, ignoreCase: true, out label) && Enum.IsDefined(label)))
                    return Results.BadRequest(new { error = "invalid_label" });

                // Read at most limit + 1 bytes so the cap holds regardless of the declared length.
                var buffer = new MemoryStream();
                await using (var input = file.OpenReadStream())
                {
                    var chunk = new byte[81920];
                    while (buffer.Length <= MaxBytes)
                    {
                        var toRead = (int)Math.Min(chunk.Length, MaxBytes + 1 - buffer.Length);
                        var read = await input.ReadAsync(chunk.AsMemory(0, toRead), ct);
                        if (read == 0) break;
                        buffer.Write(chunk, 0, read);
                    }
                }
                if (buffer.Length > MaxBytes) return Results.BadRequest(new { error = "too_large" });

                // The type comes from the file's magic bytes; client Content-Type and filename are ignored.
                var contentType = ImageSignature.Detect(buffer.GetBuffer().AsSpan(0, (int)Math.Min(buffer.Length, 16)));
                if (contentType is null) return Results.BadRequest(new { error = "unsupported_type" });

                var photo = new Photo
                {
                    EntryId = id,
                    ContentType = contentType,
                    SizeBytes = buffer.Length,
                    Label = label,
                    UploadedAt = time.GetUtcNow(),
                };
                photo.StorageKey = $"{userId}/{photo.Id:N}";

                buffer.Position = 0;
                await storage.SaveAsync(photo.StorageKey, buffer, contentType, ct);
                try
                {
                    db.Photos.Add(photo);
                    await db.SaveChangesAsync(ct);
                }
                catch
                {
                    await storage.DeleteAsync(photo.StorageKey, CancellationToken.None);
                    throw;
                }
                return Results.Created($"/api/photos/{photo.Id}", new IdDto(photo.Id));
            })
            .WithMetadata(new RequestSizeLimitAttribute(RequestLimit))
            // CSRF: the auth cookie is SameSite=Lax and the API is same-origin JSON/multipart from our SPA only, so antiforgery tokens are not used.
            .DisableAntiforgery();

        secured.MapPatch("/photos/{id:guid}", async (Guid id, PhotoLabelDto dto, HttpContext http, AppDbContext db, CancellationToken ct) =>
        {
            if (!Enum.IsDefined(dto.Label)) return Results.BadRequest(new { error = "invalid_label" });
            var photo = await OwnedPhotos(db, http.User.UserId()).FirstOrDefaultAsync(p => p.Id == id, ct);
            if (photo is null) return Results.NotFound();
            photo.Label = dto.Label;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        secured.MapGet("/photos/{id:guid}", async (Guid id, HttpContext http, AppDbContext db, IPhotoStorage storage, CancellationToken ct) =>
        {
            var photo = await OwnedPhotos(db, http.User.UserId()).AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
            if (photo is null) return Results.NotFound();
            var stream = await storage.OpenReadAsync(photo.StorageKey, ct);
            if (stream is null) return Results.NotFound();

            http.Response.Headers.CacheControl = "private, max-age=86400";
            http.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Results.Stream(stream, photo.ContentType);
        });

        secured.MapDelete("/photos/{id:guid}", async (Guid id, HttpContext http, AppDbContext db,
            IPhotoStorage storage, ILogger<IPhotoStorage> log, CancellationToken ct) =>
        {
            var photo = await OwnedPhotos(db, http.User.UserId()).FirstOrDefaultAsync(p => p.Id == id, ct);
            if (photo is null) return Results.NotFound();
            db.Photos.Remove(photo);
            await db.SaveChangesAsync(ct);
            await DeleteFilesAsync(storage, log, [photo.StorageKey]);
            return Results.NoContent();
        });
    }

    private static IQueryable<Photo> OwnedPhotos(AppDbContext db, string userId) =>
        db.Photos.Where(p => db.Entries.Any(e => e.Id == p.EntryId && e.Contest.OwnerId == userId));

    /// <summary>Storage keys of the owner's photos, optionally limited to one entry or contest; collect before deleting rows.</summary>
    public static Task<List<string>> KeysAsync(AppDbContext db, string userId, Guid? entryId = null, Guid? contestId = null) =>
        db.Photos
            .Where(p => db.Entries.Any(e => e.Id == p.EntryId && e.Contest.OwnerId == userId
                && (entryId == null || e.Id == entryId) && (contestId == null || e.ContestId == contestId)))
            .Select(p => p.StorageKey)
            .ToListAsync();

    /// <summary>Best effort: the DB delete already succeeded, so storage failures are only logged.</summary>
    public static async Task DeleteFilesAsync(IPhotoStorage storage, ILogger log, IEnumerable<string> keys)
    {
        foreach (var key in keys)
        {
            try { await storage.DeleteAsync(key, CancellationToken.None); }
            catch (Exception ex) { log.LogWarning(ex, "Could not delete photo file {Key}", key); }
        }
    }
}
