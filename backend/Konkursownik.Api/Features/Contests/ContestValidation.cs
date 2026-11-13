using Konkursownik.Api.Domain;

namespace Konkursownik.Api.Features.Contests;

public static class ContestValidation
{
    public static Dictionary<string, string[]> Validate(ContestUpsertDto d)
    {
        var errors = new Dictionary<string, string[]>();
        void Add(string key, string msg) => errors[key] = [msg];

        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 200)
            Add(nameof(d.Name), "Nazwa jest wymagana (maks. 200 znaków).");
        if (d.EndDate < d.StartDate)
            Add(nameof(d.EndDate), "Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.");
        if (d.ResultsDate is { } r && r < d.StartDate)
            Add(nameof(d.ResultsDate), "Data wyników nie może być wcześniejsza niż data rozpoczęcia.");
        if (d.EntryLimitPerDay is <= 0)
            Add(nameof(d.EntryLimitPerDay), "Limit musi być większy od zera.");
        if (d.EntryLimitTotal is <= 0)
            Add(nameof(d.EntryLimitTotal), "Limit musi być większy od zera.");
        if (d.PrizeValue is < 0)
            Add(nameof(d.PrizeValue), "Wartość nagrody nie może być ujemna.");

        static bool Bad(string? s) => string.IsNullOrWhiteSpace(s) || s.Length > 300;
        if (d.Tasks.Any(t => Bad(t.Text)))
            Add(nameof(d.Tasks), "Treść kroku jest wymagana (maks. 300 znaków).");
        if (d.Purchases.Any(p => Bad(p.Product)))
            Add(nameof(d.Purchases), "Nazwa produktu jest wymagana (maks. 300 znaków).");
        if (d.Proofs.Any(p => Bad(p.What)))
            Add(nameof(d.Proofs), "Opis dowodu jest wymagany (maks. 300 znaków).");

        if (d.Icon is not null && !ContestIcons.All.Contains(d.Icon))
            Add(nameof(d.Icon), "Nieznana ikona konkursu.");
        if (d.Purchases.Any(p => p.Note is { Length: > 300 }) || d.Proofs.Any(p => p.Note is { Length: > 300 }))
            Add("Note", "Notatka może mieć maks. 300 znaków.");

        return errors;
    }
}
