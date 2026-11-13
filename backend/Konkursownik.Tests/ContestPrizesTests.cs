using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Data;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Konkursownik.Tests;

[Collection("api")]
public class ContestPrizesTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    [Fact]
    public async Task Prizes_roundtrip_in_order()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(prizes:
        [
            new PrizeDto(null, "Samochód", 120000m, 1),
            new PrizeDto(null, "Rower", 2500m, 10),
        ]));

        var got = (await GetAsync(c, id))!;
        Assert.Equal(["Samochód", "Rower"], got.Prizes.Select(p => p.Name));
        Assert.Equal([120000m, 2500m], got.Prizes.Select(p => p.Value));
        Assert.Equal([1, 10], got.Prizes.Select(p => p.Count));
        Assert.All(got.Prizes, p => Assert.NotNull(p.Id));
    }

    [Fact]
    public async Task Put_keeps_prize_ids_and_removes_missing()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(prizes:
        [
            new PrizeDto(null, "A", 1m, 1),
            new PrizeDto(null, "B", 2m, 2),
        ]));
        var before = (await GetAsync(c, id))!;

        var update = Samples.Contest(prizes:
        [
            new PrizeDto(before.Prizes[1].Id, "B zmieniona", null, null),
            new PrizeDto(null, "C", 3m, 3),
        ]);
        var res = await c.PutAsJsonAsync($"/api/contests/{id}", update, JsonConfig.Options);
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var after = (await GetAsync(c, id))!;
        Assert.Equal(["B zmieniona", "C"], after.Prizes.Select(p => p.Name));
        Assert.Equal(before.Prizes[1].Id, after.Prizes[0].Id);
        Assert.NotEqual(before.Prizes[0].Id, after.Prizes[1].Id);
        Assert.Null(after.Prizes[0].Value);
    }

    [Fact]
    public async Task Invalid_prize_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        foreach (var bad in new[]
        {
            new PrizeDto(null, "", null, null),
            new PrizeDto(null, new string('x', 201), null, null),
            new PrizeDto(null, "Ok", -1m, null),
            new PrizeDto(null, "Ok", null, 0),
        })
        {
            var res = await c.PostAsJsonAsync("/api/contests", Samples.Contest(prizes: [bad]), JsonConfig.Options);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            var body = await res.Content.ReadAsStringAsync();
            Assert.Contains("\"Prizes\"", body);
        }
    }

    [Fact]
    public async Task Duplicate_copies_prizes_with_new_ids()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest(prizes:
        [
            new PrizeDto(null, "Samochód", 120000m, 1),
            new PrizeDto(null, "Rower", 2500m, 10),
        ]));
        var src = (await GetAsync(c, id))!;

        var res = await c.PostAsync($"/api/contests/{id}/duplicate", null);
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var newId = (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;

        var copy = (await GetAsync(c, newId))!;
        Assert.Equal(["Samochód", "Rower"], copy.Prizes.Select(p => p.Name));
        Assert.Equal([120000m, 2500m], copy.Prizes.Select(p => p.Value));
        Assert.Equal([1, 10], copy.Prizes.Select(p => p.Count));
        Assert.Empty(copy.Prizes.Select(p => p.Id).Intersect(src.Prizes.Select(p => p.Id)));
    }

    [Fact]
    public async Task Migration_moves_single_prize()
    {
        var baseCs = factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("Default")!;
        var cs = new NpgsqlConnectionStringBuilder(baseCs) { Database = "migr_" + Guid.NewGuid().ToString("N") }.ToString();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(cs).Options;
        await using var db = new AppDbContext(options);

        await db.GetService<IMigrator>().MigrateAsync("20261113082202_WinSteps");

        var withPrize = Guid.NewGuid();
        var without = Guid.NewGuid();
        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "AspNetUsers" ("Id","EmailConfirmed","PhoneNumberConfirmed","TwoFactorEnabled","LockoutEnabled","AccessFailedCount")
            VALUES ('u1', false, false, false, false, 0)
            """);
        await InsertContestAsync(db, withPrize, "Bon", 50m, 3);
        await InsertContestAsync(db, without, null, null, null);

        await db.Database.MigrateAsync();

        var prizes = await db.Set<Konkursownik.Api.Domain.ContestPrize>().AsNoTracking().ToListAsync();
        var p = Assert.Single(prizes);
        Assert.Equal(withPrize, p.ContestId);
        Assert.Equal("Bon", p.Name);
        Assert.Equal(50m, p.Value);
        Assert.Equal(3, p.Count);
        Assert.Equal(0, p.Order);

        await db.Database.EnsureDeletedAsync();
    }

    [Fact]
    public async Task Migration_normalizes_legacy_values()
    {
        var baseCs = factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("Default")!;
        var cs = new NpgsqlConnectionStringBuilder(baseCs) { Database = "migr_" + Guid.NewGuid().ToString("N") }.ToString();
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(cs).Options);
        await db.GetService<IMigrator>().MigrateAsync("20261113082202_WinSteps");

        await db.Database.ExecuteSqlRawAsync("""
            INSERT INTO "AspNetUsers" ("Id","EmailConfirmed","PhoneNumberConfirmed","TwoFactorEnabled","LockoutEnabled","AccessFailedCount")
            VALUES ('u1', false, false, false, false, 0)
            """);
        var blank = Guid.NewGuid();
        var zero = Guid.NewGuid();
        var longDesc = Guid.NewGuid();
        var onlyBlank = Guid.NewGuid();
        await InsertContestAsync(db, blank, "   ", 10m, null);
        await InsertContestAsync(db, zero, "Bon", null, 0);
        await InsertContestAsync(db, longDesc, new string('x', 250), null, null);
        await InsertContestAsync(db, onlyBlank, "  ", null, null);

        await db.Database.MigrateAsync();

        var prizes = await db.Set<Konkursownik.Api.Domain.ContestPrize>().AsNoTracking().ToListAsync();
        Assert.Equal(3, prizes.Count);
        var b = prizes.Single(p => p.ContestId == blank);
        Assert.Equal("Nagroda", b.Name);
        Assert.Equal(10m, b.Value);
        Assert.Null(prizes.Single(p => p.ContestId == zero).Count);
        Assert.Equal(200, prizes.Single(p => p.ContestId == longDesc).Name.Length);
        Assert.DoesNotContain(prizes, p => p.ContestId == onlyBlank);

        await db.Database.EnsureDeletedAsync();
    }

    [Fact]
    public async Task Missing_or_null_prizes_returns_400()
    {
        var c = await factory.CreateUserClientAsync();
        foreach (var json in new[] { null, "null" })
        {
            var body = System.Text.Json.JsonSerializer.SerializeToNode(Samples.Contest(), JsonConfig.Options)!.AsObject();
            body.Remove("prizes");
            if (json is not null) body["prizes"] = null;
            var res = await c.PostAsJsonAsync("/api/contests", body);
            Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
            Assert.Contains("\"Prizes\"", await res.Content.ReadAsStringAsync());

            var id = await Samples.CreateContestAsync(c, Samples.Contest());
            var put = await c.PutAsJsonAsync($"/api/contests/{id}", body);
            Assert.Equal(HttpStatusCode.BadRequest, put.StatusCode);
        }
    }

    [Fact]
    public async Task Migration_down_restores_first_prize_by_order()
    {
        var baseCs = factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("Default")!;
        var cs = new NpgsqlConnectionStringBuilder(baseCs) { Database = "migr_" + Guid.NewGuid().ToString("N") }.ToString();
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(cs).Options);
        await db.Database.MigrateAsync();

        var cid = Guid.NewGuid();
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO "AspNetUsers" ("Id","EmailConfirmed","PhoneNumberConfirmed","TwoFactorEnabled","LockoutEnabled","AccessFailedCount")
            VALUES ('u1', false, false, false, false, 0)
            """);
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO "Contests" ("Id","OwnerId","Name","Type","StartDate","EndDate","Status","CreatedAt")
            VALUES ({cid},'u1','K', 0, DATE '2026-11-01', DATE '2026-11-30', 0, now())
            """);
        await db.Database.ExecuteSqlAsync($"""
            INSERT INTO "ContestPrizes" ("Id","ContestId","Name","Value","Count","Order")
            VALUES ({Guid.NewGuid()}, {cid}, 'Drugi', 2, 2, 1), ({Guid.NewGuid()}, {cid}, 'Pierwszy', 1, 1, 0)
            """);

        await db.GetService<IMigrator>().MigrateAsync("20261113082202_WinSteps");

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand("""SELECT "PrizeDescription","PrizeValue","PrizeCount" FROM "Contests" """, conn);
        await using var r = await cmd.ExecuteReaderAsync();
        Assert.True(await r.ReadAsync());
        Assert.Equal("Pierwszy", r.GetString(0));
        Assert.Equal(1m, r.GetDecimal(1));
        Assert.Equal(1, r.GetInt32(2));
        await r.CloseAsync();
        await conn.CloseAsync();
        NpgsqlConnection.ClearAllPools();
        await db.Database.EnsureDeletedAsync();
    }

    private static Task InsertContestAsync(AppDbContext db, Guid id, string? description, decimal? value, int? count) =>
        db.Database.ExecuteSqlAsync($"""
            INSERT INTO "Contests" ("Id","OwnerId","Name","Type","PrizeDescription","PrizeValue","PrizeCount",
                "StartDate","EndDate","Status","CreatedAt")
            VALUES ({id},'u1','K', 0, {description}, {value}, {count},
                DATE '2026-11-01', DATE '2026-11-30', 0, now())
            """);
}
