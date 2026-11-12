using Konkursownik.Api.Features.Photos;
using Microsoft.Extensions.Configuration;

namespace Konkursownik.Tests;

public class PhotoStorageFactoryTests
{
    private static IConfiguration Cfg(params (string, string?)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.ToDictionary(v => v.Item1, v => v.Item2))
            .Build();

    [Theory]
    [InlineData("Local")]
    [InlineData("local")]
    public void Local_is_case_insensitive(string provider)
    {
        var storage = PhotoStorageFactory.Create(Cfg(("Storage:Provider", provider), ("Storage:LocalPath", Path.GetTempPath())));
        Assert.IsType<LocalPhotoStorage>(storage);
    }

    [Theory]
    [InlineData("AzureBlob")]
    [InlineData("azureblob")]
    public void AzureBlob_is_case_insensitive(string provider)
    {
        var storage = PhotoStorageFactory.Create(Cfg(("Storage:Provider", provider), ("Storage:BlobConnectionString", "UseDevelopmentStorage=true")));
        Assert.IsType<AzureBlobPhotoStorage>(storage);
    }

    [Fact]
    public void Unknown_provider_throws_with_clear_message()
    {
        var ex = Assert.Throws<InvalidOperationException>(() => PhotoStorageFactory.Create(Cfg(("Storage:Provider", "Azure-Blob"))));
        Assert.Contains("Azure-Blob", ex.Message);
    }

    [Fact]
    public void AzureBlob_without_connection_string_throws()
    {
        Assert.Throws<InvalidOperationException>(() => PhotoStorageFactory.Create(Cfg(("Storage:Provider", "AzureBlob"), ("Storage:BlobConnectionString", ""))));
    }
}
