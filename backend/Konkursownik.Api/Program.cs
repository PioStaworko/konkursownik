using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Ai;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Photos;
using Konkursownik.Api.Features.Proofs;
using Konkursownik.Api.Features.Reminders;
using Konkursownik.Api.Features.ShoppingList;
using Konkursownik.Api.Features.Stats;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o => JsonConfig.Configure(o.SerializerOptions));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// Behind Caddy / App Service front-ends: trust X-Forwarded-* from any proxy.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

// Container/selfhost: persist Data Protection keys so cookies survive restarts. Unset on App Service.
var keysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(keysPath))
{
    builder.Services.AddDataProtection().PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

builder.Services.AddSingleton<IPhotoStorage>(sp => PhotoStorageFactory.Create(sp.GetRequiredService<IConfiguration>()));

builder.Services.AddIdentityCore<AppUser>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequiredLength = 8;
        o.Password.RequireDigit = false;
        o.Password.RequireLowercase = false;
        o.Password.RequireUppercase = false;
        o.Password.RequireNonAlphanumeric = false;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager();

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, o =>
    {
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Lax;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromDays(30);
        o.SlidingExpiration = true;
        o.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
    });
builder.Services.AddAuthorization();
builder.Services.AddAiServices(builder.Configuration);

var app = builder.Build();

// Fail fast on bad storage configuration instead of at the first photo request.
_ = app.Services.GetRequiredService<IPhotoStorage>();

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseForwardedHeaders();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapGet("/api/health", () => new { status = "ok" }).AllowAnonymous();
app.MapPublicAuthEndpoints();

// Every other /api endpoint belongs on this group and therefore requires a signed-in user.
var secured = app.MapGroup("/api").RequireAuthorization();
secured.MapAccountEndpoints();
secured.MapAiFeatureEndpoints();
secured.MapContestEndpoints();
secured.MapEntryEndpoints();
secured.MapItemToggleEndpoints();
secured.MapPhotoEndpoints();
secured.MapProofEndpoints();
secured.MapReminderEndpoints();
secured.MapShoppingListEndpoints();
secured.MapStatsEndpoints();

// SPA fallback for client-side routes; unknown /api/... paths must stay 404.
app.MapFallbackToFile("{**path:nonfile:regex(^(?!api(/|$)).*$)}", "index.html");

app.Run();

public partial class Program;
