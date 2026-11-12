using System.Text;

namespace Konkursownik.Api.Features.Photos;

public static class ImageSignature
{
    private static readonly string[] HeicBrands = ["heic", "heix", "mif1", "msf1"];

    /// <summary>Detects the image type from the file's first bytes; null when unsupported.</summary>
    public static string? Detect(ReadOnlySpan<byte> header)
    {
        if (header.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF })) return "image/jpeg";
        if (header.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })) return "image/png";
        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header.Slice(8, 4).SequenceEqual("WEBP"u8))
            return "image/webp";
        if (header.Length >= 12 && header.Slice(4, 4).SequenceEqual("ftyp"u8))
        {
            var brand = Encoding.ASCII.GetString(header.Slice(8, 4));
            if (HeicBrands.Contains(brand)) return "image/heic";
        }
        return null;
    }
}
