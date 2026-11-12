using System.Text;
using Konkursownik.Api.Features.Photos;

namespace Konkursownik.Tests;

public class ImageSignatureTests
{
    private static byte[] Heif(string brand) =>
        [0, 0, 0, 0x18, .. Encoding.ASCII.GetBytes("ftyp" + brand)];

    public static TheoryData<byte[], string?> Cases => new()
    {
        { [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10], "image/jpeg" },
        { [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0], "image/png" },
        { Encoding.ASCII.GetBytes("RIFF\0\0\0\0WEBPVP8 "), "image/webp" },
        { Heif("heic"), "image/heic" },
        { Heif("heix"), "image/heic" },
        { Heif("mif1"), "image/heic" },
        { Heif("msf1"), "image/heic" },
        { Heif("mp42"), null },
        { Encoding.ASCII.GetBytes("GIF89a"), null },
        { Encoding.ASCII.GetBytes("%PDF-1.7"), null },
        { Array.Empty<byte>(), null },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Detects_type_from_header(byte[] header, string? expected) =>
        Assert.Equal(expected, ImageSignature.Detect(header));
}
