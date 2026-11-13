using System.Net.Http.Json;
using Konkursownik.Api.Features.Ai;
using Konkursownik.Api.Features.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Testcontainers.PostgreSql;

namespace Konkursownik.Tests.Infrastructure;

public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:17").Build();
    private readonly string _storagePath = Path.Combine(Path.GetTempPath(), "konkursownik-tests-" + Guid.NewGuid().ToString("N"));

    public FakeGeminiClient Gemini { get; } = new();

    public FakePageFetcher PageFetcher { get; } = new();

    public FakeTimeProvider Clock { get; } = new(DateTimeOffset.Parse("2026-11-12T10:00:00Z"));

    public const string AdminUserName = "admin";
    public const string AdminPassword = "AdminHaslo123!";
    public const string DefaultPassword = "Haslo123!";

    /// <summary>Whether the app is configured with the admin account (a subclass can turn it off).</summary>
    protected virtual bool ConfigureAdmin => true;

    public static string NewUserName() => $"u{Guid.NewGuid():N}"[..20];

    private readonly SemaphoreSlim _seedLock = new(1, 1);
    private HttpClient? _seedClient;

    /// <summary>Logs in (once) as the configured admin and returns that client.</summary>
    private async Task<HttpClient> GetSeedClientAsync()
    {
        await _seedLock.WaitAsync();
        try
        {
            if (_seedClient is null)
            {
                var client = CreateClient();
                var res = await client.PostAsJsonAsync("/api/auth/login",
                    new LoginRequest(AdminUserName, AdminPassword));
                res.EnsureSuccessStatusCode();
                _seedClient = client;
            }
            return _seedClient;
        }
        finally { _seedLock.Release(); }
    }

    /// <summary>Returns the shared client logged in as the configured admin.</summary>
    public Task<HttpClient> CreateAdminClientAsync() => GetSeedClientAsync();

    /// <summary>Creates a fresh invite code issued by the admin.</summary>
    public async Task<string> CreateInviteCodeAsync()
    {
        var seed = await GetSeedClientAsync();
        var res = await seed.PostAsync("/api/invites", null);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<InviteDto>())!.Code;
    }

    /// <summary>Registers a new user (invited by the admin) and returns a client logged in as them.</summary>
    public async Task<HttpClient> CreateUserClientAsync(string? userName = null)
    {
        var code = await CreateInviteCodeAsync();
        var client = CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(userName ?? NewUserName(), DefaultPassword, code));
        res.EnsureSuccessStatusCode();
        return client;
    }

    public async Task InitializeAsync() => await _db.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
        if (Directory.Exists(_storagePath)) Directory.Delete(_storagePath, true);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = _db.GetConnectionString(),
                ["Database:MigrateOnStartup"] = "true",
                ["Storage:Provider"] = "Local",
                ["Storage:LocalPath"] = _storagePath,
                ["Gemini:ApiKey"] = "test",
                ["Gemini:Model"] = "test",
            };
            if (ConfigureAdmin)
            {
                settings["Admin:UserName"] = AdminUserName;
                settings["Admin:Password"] = AdminPassword;
            }
            config.AddInMemoryCollection(settings);
        });
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<IGeminiClient>();
            services.AddSingleton<IGeminiClient>(Gemini);
            services.RemoveAll<IPageFetcher>();
            services.AddSingleton<IPageFetcher>(PageFetcher);
        });
    }
}

[CollectionDefinition("api")]
public class ApiCollection : ICollectionFixture<ApiFactory>;
