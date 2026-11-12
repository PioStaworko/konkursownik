using Azure.Storage.Blobs;

namespace Konkursownik.Api.Features.Photos;

public static class PhotoStorageFactory
{
    public static IPhotoStorage Create(IConfiguration cfg)
    {
        var provider = cfg["Storage:Provider"];
        if (string.IsNullOrWhiteSpace(provider) || provider.Equals("Local", StringComparison.OrdinalIgnoreCase))
        {
            return new LocalPhotoStorage(cfg["Storage:LocalPath"] ?? "photos");
        }

        if (provider.Equals("AzureBlob", StringComparison.OrdinalIgnoreCase))
        {
            var conn = cfg["Storage:BlobConnectionString"];
            if (string.IsNullOrWhiteSpace(conn))
            {
                throw new InvalidOperationException(
                    "Storage:Provider is AzureBlob but Storage:BlobConnectionString is empty.");
            }
            return new AzureBlobPhotoStorage(new BlobContainerClient(conn, cfg["Storage:BlobContainer"] ?? "photos"));
        }

        throw new InvalidOperationException(
            $"Unknown Storage:Provider '{provider}'. Use 'Local' or 'AzureBlob'.");
    }
}
