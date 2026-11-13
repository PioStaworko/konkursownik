using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Konkursownik.Api.Data;
using Konkursownik.Api.Features.Ai;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Tests.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Konkursownik.Tests;

[Collection("api")]
public class AiReceiptTests(ApiFactory factory)
{
    private static readonly byte[] JpegHeader = [0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46];

    private static JsonElement Json(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static Task<HttpResponseMessage> PostReceiptAsync(HttpClient c, byte[]? bytes = null, string contentType = "image/jpeg")
    {
        var file = new ByteArrayContent(bytes ?? JpegHeader);
        file.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);
        return c.PostAsync("/api/ai/receipt", new MultipartFormDataContent { { file, "file", "r.jpg" } });
    }

    private static async Task<string?> ErrorOf(HttpResponseMessage res) =>
        (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString();

    private async Task<HttpClient> RegisterAsync(WebApplicationFactory<Program> f)
    {
        var code = await factory.CreateInviteCodeAsync();
        var client = f.CreateClient();
        (await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(ApiFactory.NewUserName(), "Haslo123!", code))).EnsureSuccessStatusCode();
        return client;
    }

    [Fact]
    public void Map_full_receipt()
    {
        var dto = ReceiptExtraction.Map(Json("""{"store":"Biedronka","date":"2026-11-11","amount":24.9,"receiptNumber":"00482/0219","products":[{"name":"Ptasie Mleczko","price":12.45}]}"""));
        Assert.Equal("Biedronka", dto.Store);
        Assert.Equal(new DateOnly(2026, 11, 11), dto.Date);
        Assert.Equal(24.9m, dto.Amount);
        Assert.Equal("00482/0219", dto.ReceiptNumber);
        var p = Assert.Single(dto.Products);
        Assert.Equal("Ptasie Mleczko", p.Name);
        Assert.Equal(12.45m, p.Price);
    }

    [Fact]
    public void Map_garbage_fields_become_null()
    {
        var dto = ReceiptExtraction.Map(Json("""{"store":5,"date":"11 listopada","amount":"dużo","receiptNumber":null,"products":[{"price":3}]}"""));
        Assert.Null(dto.Store);
        Assert.Null(dto.Date);
        Assert.Null(dto.Amount);
        Assert.Null(dto.ReceiptNumber);
        Assert.Empty(dto.Products);
    }

    [Fact]
    public void Map_amount_string_with_comma()
    {
        Assert.Equal(24.90m, ReceiptExtraction.Map(Json("""{"amount":"24,90"}""")).Amount);
        Assert.Equal(24.90m, ReceiptExtraction.Map(Json("""{"amount":"24.90"}""")).Amount);
    }

    [Fact]
    public void Map_non_object_root_gives_empty_extraction()
    {
        var dto = ReceiptExtraction.Map(Json("[1,2]"));
        Assert.Null(dto.Store);
        Assert.Empty(dto.Products);
    }

    [Fact]
    public async Task Endpoint_returns_extraction()
    {
        var client = await factory.CreateUserClientAsync();
        factory.Gemini.EnqueueJson("""{"store":"Biedronka","date":"2026-11-11","amount":24.9,"receiptNumber":"1","products":[{"name":"Mleko","price":3.5}]}""");

        var res = await PostReceiptAsync(client);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Biedronka", body.GetProperty("store").GetString());
        Assert.Equal("2026-11-11", body.GetProperty("date").GetString());
        Assert.Equal(24.9m, body.GetProperty("amount").GetDecimal());
        Assert.Equal("Mleko", body.GetProperty("products")[0].GetProperty("name").GetString());
        var call = factory.Gemini.Calls[^1];
        Assert.Equal(ReceiptExtraction.Prompt, call.Prompt);
        Assert.Contains(call.Parts, p => p.MimeType == "image/jpeg" && p.Data!.SequenceEqual(JpegHeader));
    }

    [Fact]
    public async Task Endpoint_unparsable_422()
    {
        var client = await factory.CreateUserClientAsync();
        factory.Gemini.EnqueueNull();
        var res = await PostReceiptAsync(client);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, res.StatusCode);
        Assert.Equal("extraction_failed", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_gemini_down_503()
    {
        var client = await factory.CreateUserClientAsync();
        factory.Gemini.EnqueueException(new GeminiUnavailableException("down"));
        var res = await PostReceiptAsync(client);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        Assert.Equal("ai_unavailable", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_gemini_busy_429()
    {
        var client = await factory.CreateUserClientAsync();
        factory.Gemini.EnqueueException(new GeminiBusyException());
        var res = await PostReceiptAsync(client);
        Assert.Equal(HttpStatusCode.TooManyRequests, res.StatusCode);
        Assert.Equal("ai_busy", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_rejects_non_image_400()
    {
        var client = await factory.CreateUserClientAsync();
        var res = await PostReceiptAsync(client, "hello, not an image"u8.ToArray(), "text/plain");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("unsupported_type", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_rejects_too_large_400()
    {
        var client = await factory.CreateUserClientAsync();
        var big = new byte[10 * 1024 * 1024 + 1];
        JpegHeader.CopyTo(big, 0);
        var res = await PostReceiptAsync(client, big);
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("too_large", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_requires_login()
    {
        var res = await PostReceiptAsync(factory.CreateClient());
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Endpoint_503_when_ai_disabled()
    {
        await using var noKey = factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
            c.AddInMemoryCollection(new Dictionary<string, string?> { ["Gemini:ApiKey"] = "" })));
        var client = await RegisterAsync(noKey);

        var res = await PostReceiptAsync(client);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, res.StatusCode);
        Assert.Equal("ai_unavailable", await ErrorOf(res));
    }

    [Fact]
    public async Task Endpoint_rate_limited_429()
    {
        await using var limited = factory.WithWebHostBuilder(b => b.ConfigureAppConfiguration((_, c) =>
            c.AddInMemoryCollection(new Dictionary<string, string?> { ["Gemini:RequestsPerHour"] = "2" })));
        var client = await RegisterAsync(limited);

        for (var i = 0; i < 2; i++)
        {
            factory.Gemini.EnqueueJson("""{"store":"X"}""");
            Assert.Equal(HttpStatusCode.OK, (await PostReceiptAsync(client)).StatusCode);
        }
        var third = await PostReceiptAsync(client);

        Assert.Equal(HttpStatusCode.TooManyRequests, third.StatusCode);
        Assert.Equal("rate_limited", await ErrorOf(third));
    }

    [Fact]
    public async Task Endpoint_saves_nothing()
    {
        var client = await factory.CreateUserClientAsync();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var photos = await db.Photos.CountAsync();
        var entries = await db.Entries.CountAsync();
        factory.Gemini.EnqueueJson("""{"store":"Biedronka"}""");

        Assert.Equal(HttpStatusCode.OK, (await PostReceiptAsync(client)).StatusCode);

        Assert.Equal(photos, await db.Photos.CountAsync());
        Assert.Equal(entries, await db.Entries.CountAsync());
    }
}
