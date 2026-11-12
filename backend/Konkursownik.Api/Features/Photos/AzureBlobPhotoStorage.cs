using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Konkursownik.Api.Features.Photos;

public class AzureBlobPhotoStorage(BlobContainerClient container) : IPhotoStorage
{
    private readonly SemaphoreSlim _initLock = new(1, 1);
    private bool _initialized;

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct)
    {
        await EnsureContainerAsync(ct);
        await container.GetBlobClient(key).UploadAsync(content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } }, ct);
    }

    public async Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        await EnsureContainerAsync(ct);
        try
        {
            return await container.GetBlobClient(key).OpenReadAsync(cancellationToken: ct);
        }
        catch (RequestFailedException ex) when (ex.Status == 404) { return null; }
    }

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        await EnsureContainerAsync(ct);
        await container.GetBlobClient(key).DeleteIfExistsAsync(cancellationToken: ct);
    }

    private async Task EnsureContainerAsync(CancellationToken ct)
    {
        if (_initialized) return;
        await _initLock.WaitAsync(ct);
        try
        {
            if (_initialized) return;
            await container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
            _initialized = true;
        }
        finally { _initLock.Release(); }
    }
}
