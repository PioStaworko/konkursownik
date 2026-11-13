using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Konkursownik.Api.Features.Ai;

public record ReceiptProductDto(string Name, decimal? Price);

public record ReceiptExtractionDto(string? Store, DateOnly? Date, decimal? Amount, string? ReceiptNumber, List<ReceiptProductDto> Products);

/// <summary>Prompt, response schema and tolerant mapping for reading a shopping receipt photo.</summary>
public static class ReceiptExtraction
{
    public const string Prompt =
        "Odczytaj dane z paragonu na zdjęciu. Zwróć: nazwę sklepu (store), datę zakupu w formacie RRRR-MM-DD (date), " +
        "kwotę do zapłaty brutto jako liczbę (amount), numer paragonu (receiptNumber) oraz listę pozycji (products) " +
        "z nazwą (name) i ceną (price). Jeśli czegoś nie da się odczytać, użyj null. Niczego nie zgaduj.";

    public static readonly JsonObject Schema = new()
    {
        ["type"] = "object",
        ["properties"] = new JsonObject
        {
            ["store"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
            ["date"] = new JsonObject { ["type"] = new JsonArray("string", "null"), ["description"] = "RRRR-MM-DD" },
            ["amount"] = new JsonObject { ["type"] = new JsonArray("number", "null") },
            ["receiptNumber"] = new JsonObject { ["type"] = new JsonArray("string", "null") },
            ["products"] = new JsonObject
            {
                ["type"] = "array",
                ["items"] = new JsonObject
                {
                    ["type"] = "object",
                    ["properties"] = new JsonObject
                    {
                        ["name"] = new JsonObject { ["type"] = "string" },
                        ["price"] = new JsonObject { ["type"] = new JsonArray("number", "null") },
                    },
                    ["required"] = new JsonArray("name"),
                },
            },
        },
    };

    /// <summary>Fields that are missing or of the wrong type become null; products without a name are dropped.</summary>
    public static ReceiptExtractionDto Map(JsonElement json)
    {
        if (json.ValueKind != JsonValueKind.Object) return new(null, null, null, null, []);

        List<ReceiptProductDto> products = [];
        if (json.TryGetProperty("products", out var list) && list.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in list.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.Object) continue;
                var name = Text(item, "name");
                if (name is null) continue;
                products.Add(new ReceiptProductDto(name, Number(item, "price")));
            }
        }
        return new(Text(json, "store"), Date(json, "date"), Number(json, "amount"), Text(json, "receiptNumber"), products);
    }

    private static string? Text(JsonElement obj, string name)
    {
        if (!obj.TryGetProperty(name, out var v) || v.ValueKind != JsonValueKind.String) return null;
        var s = v.GetString()?.Trim();
        return string.IsNullOrEmpty(s) ? null : s;
    }

    private static DateOnly? Date(JsonElement obj, string name) =>
        Text(obj, name) is { } s && DateOnly.TryParseExact(s, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;

    private static decimal? Number(JsonElement obj, string name)
    {
        if (!obj.TryGetProperty(name, out var v)) return null;
        if (v.ValueKind == JsonValueKind.Number) return v.TryGetDecimal(out var n) ? n : null;
        if (v.ValueKind != JsonValueKind.String) return null;
        var s = v.GetString()?.Trim().Replace(',', '.');
        return decimal.TryParse(s, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }
}
