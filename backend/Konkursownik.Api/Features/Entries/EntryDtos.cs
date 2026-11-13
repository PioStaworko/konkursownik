using Konkursownik.Api.Features.Contests;

namespace Konkursownik.Api.Features.Entries;

public record EntryUpsertDto(
    DateOnly Date, string? ConfirmationCode, string? ReceiptNumber,
    decimal? PurchaseAmount, string? ContactUsed, string? AnswerText, string? Store);

public record ToggleDto(bool Value);

public static class EntryValidation
{
    public static Dictionary<string, string[]> Validate(EntryUpsertDto d)
    {
        var errors = new Dictionary<string, string[]>();
        void Add(string key, string msg) => errors[key] = [msg];

        if (d.PurchaseAmount is < 0)
            Add(nameof(d.PurchaseAmount), "Kwota zakupu nie może być ujemna.");
        if (d.AnswerText is { Length: > 5000 })
            Add(nameof(d.AnswerText), "Odpowiedź może mieć maks. 5000 znaków.");
        if (d.ConfirmationCode is { Length: > 200 })
            Add(nameof(d.ConfirmationCode), "Maks. 200 znaków.");
        if (d.ReceiptNumber is { Length: > 200 })
            Add(nameof(d.ReceiptNumber), "Maks. 200 znaków.");
        if (d.ContactUsed is { Length: > 200 })
            Add(nameof(d.ContactUsed), "Maks. 200 znaków.");
        if (d.Store is { Length: > 100 })
            Add(nameof(d.Store), "Maks. 100 znaków.");
        return errors;
    }

    public static Dictionary<string, string[]> Validate(WinDto d)
    {
        var errors = new Dictionary<string, string[]>();
        void Add(string key, string msg) => errors[key] = [msg];

        if (string.IsNullOrWhiteSpace(d.PrizeWon) || d.PrizeWon.Length > 300)
            Add(nameof(d.PrizeWon), "Opis wygranej jest wymagany (maks. 300 znaków).");
        if (d.PrizeValue is < 0)
            Add(nameof(d.PrizeValue), "Wartość nagrody nie może być ujemna.");
        if (d.Steps is not null && d.Steps.Any(s => string.IsNullOrWhiteSpace(s.Text) || s.Text.Trim().Length > 300))
            Add(nameof(d.Steps), "Tekst kroku jest wymagany (maks. 300 znaków).");
        return errors;
    }
}
