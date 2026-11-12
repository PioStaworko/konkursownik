namespace Konkursownik.Api.Features.Photos;

public class LocalPhotoStorage : IPhotoStorage
{
    private readonly string _root;

    public LocalPhotoStorage(string rootPath)
    {
        _root = Path.GetFullPath(rootPath).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
    }

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct)
    {
        var path = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var file = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(file, ct);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken ct)
    {
        var path = Resolve(key);
        if (!File.Exists(path)) return Task.FromResult<Stream?>(null);
        try
        {
            return Task.FromResult<Stream?>(new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true));
        }
        catch (FileNotFoundException) { return Task.FromResult<Stream?>(null); }
        catch (DirectoryNotFoundException) { return Task.FromResult<Stream?>(null); }
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        var path = Resolve(key);
        if (File.Exists(path)) File.Delete(path); // missing file or directory is not an error
        return Task.CompletedTask;
    }

    /// <summary>Maps a key to a path and rejects anything that would land outside the root.</summary>
    private string Resolve(string key)
    {
        var full = Path.GetFullPath(Path.Combine(_root, key));
        if (!full.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new ArgumentException("Storage key escapes the storage root.", nameof(key));
        return full;
    }
}
