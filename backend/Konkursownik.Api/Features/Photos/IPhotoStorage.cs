namespace Konkursownik.Api.Features.Photos;

public interface IPhotoStorage
{
    Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct);

    /// <summary>Returns null when the key does not exist.</summary>
    Task<Stream?> OpenReadAsync(string key, CancellationToken ct);

    /// <summary>Deleting a missing key is not an error.</summary>
    Task DeleteAsync(string key, CancellationToken ct);
}
