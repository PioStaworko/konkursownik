using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Photos;
using Konkursownik.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Konkursownik.Tests;

[Collection("api")]
public class PhotoEndpointTests(ApiFactory factory)
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46];

    private static async Task<Guid> AddEntryAsync(HttpClient c, Guid contestId)
    {
        var res = await c.PostAsJsonAsync($"/api/contests/{contestId}/entries",
            new EntryUpsertDto(DateOnly.Parse("2026-11-12"), null, null, null, null, null, null), JsonConfig.Options);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
    }

    private static async Task<(Guid contestId, Guid entryId)> NewEntryAsync(HttpClient c)
    {
        var contestId = await Samples.CreateContestAsync(c, Samples.Contest());
        return (contestId, await AddEntryAsync(c, contestId));
    }

    private static Task<HttpResponseMessage> UploadAsync(HttpClient c, Guid entryId, byte[] bytes, string contentType = "image/jpeg", string field = "file")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        var form = new MultipartFormDataContent { { file, field, "x.jpg" } };
        return c.PostAsync($"/api/entries/{entryId}/photos", form);
    }

    private static async Task<Guid> UploadOkAsync(HttpClient c, Guid entryId, byte[]? bytes = null)
    {
        var res = await UploadAsync(c, entryId, bytes ?? JpegHeader);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
    }

    private async Task<string> KeyOfAsync(Guid photoId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Set<Photo>().Where(p => p.Id == photoId).Select(p => p.StorageKey).SingleAsync();
    }

    [Fact]
    public async Task Upload_then_download_returns_same_bytes_and_type()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);
        var photoId = await UploadOkAsync(c, entryId);

        var res = await c.GetAsync($"/api/photos/{photoId}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("image/jpeg", res.Content.Headers.ContentType!.MediaType);
        Assert.Equal("nosniff", res.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(res.Headers.CacheControl!.Private);
        Assert.Equal(TimeSpan.FromDays(1), res.Headers.CacheControl.MaxAge);
        Assert.Equal(JpegHeader, await res.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Heic_upload_is_accepted()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);
        byte[] heic = [0, 0, 0, 0x18, .. Encoding.ASCII.GetBytes("ftypheic"), 0, 0, 0, 0];
        var photoId = await UploadOkAsync(c, entryId, heic);

        var res = await c.GetAsync($"/api/photos/{photoId}");
        Assert.Equal("image/heic", res.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Over_10MB_returns_400_too_large()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);
        var big = new byte[10 * 1024 * 1024 + 1];
        JpegHeader.CopyTo(big, 0);

        var res = await UploadAsync(c, entryId, big);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("\"too_large\"", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Fake_image_returns_400_unsupported_type()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);

        var res = await UploadAsync(c, entryId, Encoding.ASCII.GetBytes("%PDF-1.7"), "image/jpeg");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("\"unsupported_type\"", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Missing_file_field_returns_400_unsupported_type()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);

        var res = await UploadAsync(c, entryId, JpegHeader, field: "other");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("\"unsupported_type\"", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Upload_to_foreign_entry_returns_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var other = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(owner);

        Assert.Equal(HttpStatusCode.NotFound, (await UploadAsync(other, entryId, JpegHeader)).StatusCode);
    }

    [Fact]
    public async Task Anonymous_get_is_unauthorized()
    {
        var owner = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(owner);
        var photoId = await UploadOkAsync(owner, entryId);

        var res = await factory.CreateClient().GetAsync($"/api/photos/{photoId}");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Other_users_photo_returns_404_for_get_and_delete()
    {
        var owner = await factory.CreateUserClientAsync();
        var other = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(owner);
        var photoId = await UploadOkAsync(owner, entryId);

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/api/photos/{photoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/api/photos/{photoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/photos/{photoId}")).StatusCode);
    }

    [Fact]
    public async Task Delete_photo_removes_row_and_file()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);
        var photoId = await UploadOkAsync(c, entryId);
        var key = await KeyOfAsync(photoId);

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/photos/{photoId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await c.GetAsync($"/api/photos/{photoId}")).StatusCode);
        Assert.Null(await factory.Services.GetRequiredService<IPhotoStorage>().OpenReadAsync(key, default));
    }

    [Fact]
    public async Task Deleting_entry_deletes_photo_file()
    {
        var c = await factory.CreateUserClientAsync();
        var (_, entryId) = await NewEntryAsync(c);
        var photoId = await UploadOkAsync(c, entryId);
        var key = await KeyOfAsync(photoId);
        var storage = factory.Services.GetRequiredService<IPhotoStorage>();
        await using (var existing = await storage.OpenReadAsync(key, default)) Assert.NotNull(existing);

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/entries/{entryId}")).StatusCode);
        Assert.Null(await storage.OpenReadAsync(key, default));
    }

    [Fact]
    public async Task Deleting_contest_deletes_photo_files()
    {
        var c = await factory.CreateUserClientAsync();
        var (contestId, entryId) = await NewEntryAsync(c);
        var entry2 = await AddEntryAsync(c, contestId);
        var key1 = await KeyOfAsync(await UploadOkAsync(c, entryId));
        var key2 = await KeyOfAsync(await UploadOkAsync(c, entry2));
        var storage = factory.Services.GetRequiredService<IPhotoStorage>();

        Assert.Equal(HttpStatusCode.NoContent, (await c.DeleteAsync($"/api/contests/{contestId}")).StatusCode);
        Assert.Null(await storage.OpenReadAsync(key1, default));
        Assert.Null(await storage.OpenReadAsync(key2, default));
    }
}
