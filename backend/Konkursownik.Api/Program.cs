using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Domain;
using Konkursownik.Api.Features.Auth;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Api.Features.Photos;
using Azure.Storage.Blobs;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o => JsonConfig.Configure(o.SerializerOptions));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSingleton<IPhotoStorage>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    return cfg["Storage:Provider"] switch
    {
        "AzureBlob" => new AzureBlobPhotoStorage(new BlobContainerClient(
            cfg["Storage:BlobConnectionString"], cfg["Storage:BlobContainer"] ?? "photos")),
        _ => new LocalPhotoStorage(cfg["Storage:LocalPath"] ?? "photos"),
    };
});

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

var app = builder.Build();

if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => new { status = "ok" }).AllowAnonymous();
app.MapPublicAuthEndpoints();

// Every other /api endpoint belongs on this group and therefore requires a signed-in user.
var secured = app.MapGroup("/api").RequireAuthorization();
secured.MapAccountEndpoints();
secured.MapContestEndpoints();
secured.MapEntryEndpoints();
secured.MapItemToggleEndpoints();
secured.MapPhotoEndpoints();

app.Run();

public partial class Program;
