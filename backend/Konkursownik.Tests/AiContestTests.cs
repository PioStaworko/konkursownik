using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Ai;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class AiContestTests(ApiFactory factory)
{
    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static Task<HttpResponseMessage> PostUrlAsync(HttpClient c, string? url) =>
        c.PostAsJsonAsync("/api/ai/contest", new { url });

    private static Task<HttpResponseMessage> PostFileAsync(HttpClient c, byte[] bytes, string contentType, string name)
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        return c.PostAsync("/api/ai/contest", new MultipartFormDataContent { { file, "file", name } });
    }

    private static async Task<string?> ErrorOf(HttpResponseMessage res) =>
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString();

    [Fact]
    public void Map_unknown_icon_and_type_become_null()
    {
        var dto = ContestExtraction.Map(Json("""{"name":"X","type":"Raffle","icon":"rocket","entryLimitPerDay":0,"entryLimitTotal":-3}"""));
        Assert.Equal("X", dto.Name);
        Assert.Null(dto.Type);
        Assert.Null(dto.Icon);
        Assert.Null(dto.EntryLimitPerDay);
        Assert.Null(dto.EntryLimitTotal);
        var ok = ContestExtraction.Map(Json("""{"type":"Creative","icon":"cookie","entryLimitPerDay":1,"entryLimitTotal":5}"""));
        Assert.Equal(ContestType.Creative, ok.Type);
        Assert.Equal("cookie", ok.Icon);
        Assert.Equal(1, ok.EntryLimitPerDay);
        Assert.Equal(5, ok.EntryLimitTotal);
    }

    [Fact]
    public void Map_dates_and_lists()
    {
        var dto = ContestExtraction.Map(Json("""
            {"startDate":"2026-11-01","endDate":"30.11.2026","resultsDate":"2026-12-05",
             "url":"javascript:alert(1)","rulesUrl":"https://x.pl/r.pdf",
             "tasks":["Zrób zdjęcie"," ",5,"Opisz produkt"],
             "purchases":[{"product":"Mleko","store":"Biedronka","quantity":"2 szt."},{"store":"bez produktu"}],
             "proofs":[{"what":"Paragon","keepUntil":"2027-01-31"},{"note":"brak"}]}
            """));
        Assert.Equal(new DateOnly(2026, 11, 1), dto.StartDate);
        Assert.Null(dto.EndDate);
        Assert.Equal(new DateOnly(2026, 12, 5), dto.ResultsDate);
        Assert.Null(dto.Url);
        Assert.Equal("https://x.pl/r.pdf", dto.RulesUrl);
        Assert.Equal(["Zrób zdjęcie", "Opisz produkt"], dto.Tasks);
        var purchase = Assert.Single(dto.Purchases);
        Assert.Equal("Mleko", purchase.Product);
        Assert.Equal("Biedronka", purchase.Store);
        Assert.Equal("2 szt.", purchase.Quantity);
        var proof = Assert.Single(dto.Proofs);
        Assert.Equal("Paragon", proof.What);
        Assert.Equal(new DateOnly(2027, 1, 31), proof.KeepUntil);
    }

    [Fact]
    public void Map_prizes_list()
    {
        var dto = ContestExtraction.Map(Json("""{"prizes":[{"name":"Samochód","value":120000,"count":1},{"name":"Rower","value":"2 500,00","count":10}]}"""));
        Assert.Equal(2, dto.Prizes.Count);
        Assert.Equal(new ExtractedPrizeDto("Samochód", 120000m, 1), dto.Prizes[0]);
        Assert.Equal("Rower", dto.Prizes[1].Name);
        Assert.Equal(2500m, dto.Prizes[1].Value);
        Assert.Equal(10, dto.Prizes[1].Count);
    }

    [Fact]
    public void Map_prizes_drops_nameless_and_fixes_bad_numbers()
    {
        var dto = ContestExtraction.Map(Json("""{"prizes":[{"value":5},{"name":"Bon","value":-1,"count":0}]}"""));
        var prize = Assert.Single(dto.Prizes);
        Assert.Equal("Bon", prize.Name);
        Assert.Null(prize.Value);
        Assert.Null(prize.Count);
    }

    [Fact]
    public void Map_non_object_root_gives_empty_extraction()
    {
        var dto = ContestExtraction.Map(Json("[1]"));
        Assert.Null(dto.Name);
        Assert.Empty(dto.Tasks);
    }

    [Fact]
    public async Task Url_mode_extracts_and_fills_missing_url()
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.Result = new PageText("Konkurs", "Tekst konkursu ".PadRight(300, 'x'), ["https://s.pl/regulamin.pdf"]);
        factory.Gemini.EnqueueJson("""{"name":"Wielki konkurs","organizer":"Sklep","type":"Lottery","tasks":["Kup"]}""");

        var res = await PostUrlAsync(client, "https://sklep.pl/konkurs");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Wielki konkurs", body.GetProperty("name").GetString());
        Assert.Equal("https://sklep.pl/konkurs", body.GetProperty("url").GetString());
        Assert.Equal("Lottery", body.GetProperty("type").GetString());
        var call = factory.Gemini.Calls[^1];
        Assert.Equal(ContestExtraction.Prompt, call.Prompt);
        Assert.Contains(call.Parts, p => p.Text is not null && p.Text.Contains("Tekst konkursu") && p.Text.Contains("https://s.pl/regulamin.pdf"));
        Assert.Equal("https://sklep.pl/konkurs", factory.PageFetcher.LastUrl!.ToString());
    }

    [Fact]
    public async Task Url_mode_keeps_ai_url()
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.Result = new PageText("K", new string('x', 300), []);
        factory.Gemini.EnqueueJson("""{"name":"K","url":"https://inny.pl/k"}""");

        var body = await (await PostUrlAsync(client, "https://sklep.pl/konkurs")).Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal("https://inny.pl/k", body.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Url_unreadable_returns_422_page_unreadable()
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.Result = null;

        var res = await PostUrlAsync(client, "https://sklep.pl/konkurs");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, res.StatusCode);
        Assert.Equal("page_unreadable", await ErrorOf(res));
    }

    [Fact]
    public async Task Url_mode_unparsable_ai_answer_422()
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.Result = new PageText("K", new string('x', 300), []);
        factory.Gemini.EnqueueNull();

        var res = await PostUrlAsync(client, "https://sklep.pl/konkurs");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, res.StatusCode);
        Assert.Equal("extraction_failed", await ErrorOf(res));
    }

    [Fact]
    public async Task Url_mode_gemini_down_503()
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.Result = new PageText("K", new string('x', 300), []);
        factory.Gemini.EnqueueException(new GeminiUnavailableException("down"));

        var res = await PostUrlAsync(client, "https://sklep.pl/konkurs");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
    }

    [Theory]
    [InlineData("file:///etc/passwd")]
    [InlineData("ftp://x")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:pw@sklep.pl/")]
    [InlineData("nie url")]
    [InlineData("/relative")]
    [InlineData("")]
    [InlineData(null)]
    public async Task Non_http_url_400(string? url)
    {
        var client = await factory.CreateUserClientAsync();
        factory.PageFetcher.LastUrl = null;

        var res = await PostUrlAsync(client, url);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("invalid_url", await ErrorOf(res));
        Assert.Null(factory.PageFetcher.LastUrl);
    }

    [Fact]
    public async Task Malformed_json_400_invalid_url()
    {
        var client = await factory.CreateUserClientAsync();
        var res = await client.PostAsync("/api/ai/contest", new StringContent("{nope", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("invalid_url", await ErrorOf(res));
    }

    [Fact]
    public async Task Pdf_upload_extracts()
    {
        var client = await factory.CreateUserClientAsync();
        var pdf = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n");
        factory.Gemini.EnqueueJson("""{"name":"Z PDF","url":null}""");

        var res = await PostFileAsync(client, pdf, "application/pdf", "regulamin.pdf");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Z PDF", body.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("url").ValueKind);
        Assert.Contains(factory.Gemini.Calls[^1].Parts, p => p.MimeType == "application/pdf" && p.Data!.SequenceEqual(pdf));
    }

    [Fact]
    public async Task Image_upload_extracts()
    {
        var client = await factory.CreateUserClientAsync();
        byte[] jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46];
        factory.Gemini.EnqueueJson("""{"name":"Ze zrzutu"}""");

        var res = await PostFileAsync(client, jpeg, "image/jpeg", "s.jpg");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Contains(factory.Gemini.Calls[^1].Parts, p => p.MimeType == "image/jpeg");
    }

    [Fact]
    public async Task Upload_unsupported_type_400()
    {
        var client = await factory.CreateUserClientAsync();
        var res = await PostFileAsync(client, "just text"u8.ToArray(), "text/plain", "a.txt");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("unsupported_type", await ErrorOf(res));
    }

    [Fact]
    public async Task Image_over_10mb_is_too_large()
    {
        var client = await factory.CreateUserClientAsync();
        var big = new byte[10 * 1024 * 1024 + 1];
        new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }.CopyTo(big, 0);
        var res = await PostFileAsync(client, big, "image/jpeg", "b.jpg");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("too_large", await ErrorOf(res));
    }

    [Fact]
    public async Task Pdf_over_15mb_is_too_large_but_12mb_is_accepted()
    {
        var client = await factory.CreateUserClientAsync();
        var big = new byte[15 * 1024 * 1024 + 1];
        "%PDF-"u8.CopyTo(big);
        var res = await PostFileAsync(client, big, "application/pdf", "b.pdf");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("too_large", await ErrorOf(res));

        var ok = new byte[12 * 1024 * 1024];
        "%PDF-"u8.CopyTo(ok);
        factory.Gemini.EnqueueJson("""{"name":"Duży"}""");
        Assert.Equal(HttpStatusCode.OK, (await PostFileAsync(client, ok, "application/pdf", "o.pdf")).StatusCode);
    }

    [Fact]
    public async Task Other_content_type_400()
    {
        var client = await factory.CreateUserClientAsync();
        var res = await client.PostAsync("/api/ai/contest", new StringContent("x", Encoding.UTF8, "text/plain"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Requires_login()
    {
        var res = await PostUrlAsync(factory.CreateClient(), "https://sklep.pl/");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
