using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Konkursownik.Api.Features.Photos;
using Testcontainers.Azurite;

namespace Konkursownik.Tests;

public abstract class PhotoStorageContract
{
    protected abstract Task<IPhotoStorage> CreateAsync();

    [Fact]
    public async Task Save_then_read_returns_same_bytes()
    {
        var storage = await CreateAsync();
        var key = $"{Guid.NewGuid():N}/{Guid.NewGuid():N}";
        byte[] data = [1, 2, 3, 4, 5, 250];
        await storage.SaveAsync(key, new MemoryStream(data), "image/jpeg", default);

        await using var stream = await storage.OpenReadAsync(key, default);
        Assert.NotNull(stream);
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        Assert.Equal(data, ms.ToArray());
    }

    [Fact]
    public async Task Read_missing_returns_null()
    {
        var storage = await CreateAsync();
        Assert.Null(await storage.OpenReadAsync($"{Guid.NewGuid():N}/{Guid.NewGuid():N}", default));
    }

    [Fact]
    public async Task Delete_missing_does_not_throw()
    {
        var storage = await CreateAsync();
        await storage.DeleteAsync($"{Guid.NewGuid():N}/{Guid.NewGuid():N}", default);
    }
}

public class LocalStorageTests : PhotoStorageContract, IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "konkursownik-local-" + Guid.NewGuid().ToString("N"));

    protected override Task<IPhotoStorage> CreateAsync() => Task.FromResult<IPhotoStorage>(new LocalPhotoStorage(_root));

    [Fact]
    public async Task Keys_escaping_the_root_are_rejected()
    {
        var storage = new LocalPhotoStorage(_root);
        await Assert.ThrowsAsync<ArgumentException>(() => storage.SaveAsync("../evil", new MemoryStream([1]), "image/png", default));
        await Assert.ThrowsAsync<ArgumentException>(() => storage.OpenReadAsync("../../etc/passwd", default));
        await Assert.ThrowsAsync<ArgumentException>(() => storage.DeleteAsync("../evil", default));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, true);
    }
}

public class AzuriteStorageTests : PhotoStorageContract, IAsyncLifetime
{
    private readonly AzuriteContainer _azurite = new AzuriteBuilder("mcr.microsoft.com/azure-storage/azurite:latest")
        .WithCommand("--skipApiVersionCheck")
        .Build();

    public async Task InitializeAsync() => await _azurite.StartAsync();
    public async Task DisposeAsync() => await _azurite.DisposeAsync();

    protected override Task<IPhotoStorage> CreateAsync() =>
        Task.FromResult<IPhotoStorage>(new AzureBlobPhotoStorage(new BlobContainerClient(_azurite.GetConnectionString(), "photos")));

    [Fact]
    public async Task Container_is_created_private()
    {
        var container = new BlobContainerClient(_azurite.GetConnectionString(), "photos-private-check");
        var storage = new AzureBlobPhotoStorage(container);
        await storage.SaveAsync("a/b", new MemoryStream([1]), "image/png", default);

        var props = (await container.GetPropertiesAsync()).Value;
        Assert.Equal(PublicAccessType.None, props.PublicAccess ?? PublicAccessType.None);
    }
}
