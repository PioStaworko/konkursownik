using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Photos;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class EntryStorePhotoLabelTests(ApiFactory factory)
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46];

    private static async Task<Guid> AddEntryAsync(HttpClient c, Guid contestId, string? store = null)
    {
        var res = await c.PostAsJsonAsync($"/api/contests/{contestId}/entries",
            new EntryUpsertDto(DateOnly.Parse("2026-11-12"), null, null, null, null, null, store), JsonConfig.Options);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
    }

    private static Task<HttpResponseMessage> UploadAsync(HttpClient c, Guid entryId, string? label)
    {
        var file = new ByteArrayContent(JpegHeader);
        file.Headers.ContentType = MediaTypeHeaderValue.Parse("image/jpeg");
        var form = new MultipartFormDataContent { { file, "file", "x.jpg" } };
        if (label is not null) form.Add(new StringContent(label), "label");
        return c.PostAsync($"/api/entries/{entryId}/photos", form);
    }

    private static async Task<EntryDto> OnlyEntryAsync(HttpClient c, Guid contestId) =>
        (await c.GetFromJsonAsync<ContestDto>($"/api/contests/{contestId}", JsonConfig.Options))!.Entries.Single();

    [Fact]
    public async Task Entry_store_roundtrip()
    {
        var c = await factory.CreateUserClientAsync();
        var contestId = await Samples.CreateContestAsync(c, Samples.Contest());
        var entryId = await AddEntryAsync(c, contestId, "Biedronka");
        Assert.Equal("Biedronka", (await OnlyEntryAsync(c, contestId)).Store);

        var put = await c.PutAsJsonAsync($"/api/entries/{entryId}",
            new EntryUpsertDto(DateOnly.Parse("2026-11-12"), null, null, null, null, null, "Lidl"), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, put.StatusCode);
        Assert.Equal("Lidl", (await OnlyEntryAsync(c, contestId)).Store);
    }

    [Fact]
    public async Task Upload_with_label_packaging_is_listed_with_label()
    {
        var c = await factory.CreateUserClientAsync();
        var contestId = await Samples.CreateContestAsync(c, Samples.Contest());
        var entryId = await AddEntryAsync(c, contestId);
        Assert.Equal(HttpStatusCode.Created, (await UploadAsync(c, entryId, "packaging")).StatusCode);

        var photo = (await OnlyEntryAsync(c, contestId)).Photos.Single();
        Assert.Equal(PhotoLabel.Packaging, photo.Label);
        Assert.Equal(JpegHeader.Length, photo.SizeBytes);

        var patch = await c.PatchAsJsonAsync($"/api/photos/{photo.Id}", new PhotoLabelDto(PhotoLabel.Code), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, patch.StatusCode);
        Assert.Equal(PhotoLabel.Code, (await OnlyEntryAsync(c, contestId)).Photos.Single().Label);
    }

    [Fact]
    public async Task Upload_without_label_defaults_to_receipt()
    {
        var c = await factory.CreateUserClientAsync();
        var contestId = await Samples.CreateContestAsync(c, Samples.Contest());
        var entryId = await AddEntryAsync(c, contestId);
        Assert.Equal(HttpStatusCode.Created, (await UploadAsync(c, entryId, null)).StatusCode);
        Assert.Equal(PhotoLabel.Receipt, (await OnlyEntryAsync(c, contestId)).Photos.Single().Label);
    }

    [Fact]
    public async Task Patch_photo_label_other_user_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var contestId = await Samples.CreateContestAsync(owner, Samples.Contest());
        var entryId = await AddEntryAsync(owner, contestId);
        await UploadAsync(owner, entryId, null);
        var photo = (await OnlyEntryAsync(owner, contestId)).Photos.Single();

        var other = await factory.CreateUserClientAsync();
        var res = await other.PatchAsJsonAsync($"/api/photos/{photo.Id}", new PhotoLabelDto(PhotoLabel.Other), JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal(PhotoLabel.Receipt, (await OnlyEntryAsync(owner, contestId)).Photos.Single().Label);
    }

    [Fact]
    public async Task Upload_invalid_label_400()
    {
        var c = await factory.CreateUserClientAsync();
        var contestId = await Samples.CreateContestAsync(c, Samples.Contest());
        var entryId = await AddEntryAsync(c, contestId);
        var res = await UploadAsync(c, entryId, "bogus");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Contains("invalid_label", await res.Content.ReadAsStringAsync());
        Assert.Empty((await OnlyEntryAsync(c, contestId)).Photos);
    }
}
