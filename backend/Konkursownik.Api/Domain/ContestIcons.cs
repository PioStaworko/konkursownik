namespace Konkursownik.Api.Domain;

public static class ContestIcons
{
    public const string Default = "emoji_events";

    public static readonly IReadOnlySet<string> All = new HashSet<string>
    {
        "emoji_events", "cookie", "coffee", "local_drink", "icecream", "local_pizza", "liquor",
        "bakery_dining", "storefront", "shopping_basket", "spa", "cleaning_services", "pets",
        "child_care", "checkroom", "devices", "sports_esports", "directions_car", "flight", "redeem",
    };
}
