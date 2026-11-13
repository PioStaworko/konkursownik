using System.Net;
using System.Net.Http.Json;
using Konkursownik.Api.Common;
using Konkursownik.Api.Features.Contests;
using Konkursownik.Api.Features.Entries;
using Konkursownik.Tests.Infrastructure;

namespace Konkursownik.Tests;

[Collection("api")]
public class WinStepsTests(ApiFactory factory)
{
    private static Task<ContestDto?> GetAsync(HttpClient c, Guid id) =>
        c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);

    private static Task<HttpResponseMessage> PutWin(HttpClient c, Guid id, params WinStepDto[] steps) =>
        c.PutAsJsonAsync($"/api/contests/{id}/win", new WinDto("Rower", null, null, false, steps.ToList()), JsonConfig.Options);

    [Fact]
    public async Task Put_win_with_steps_roundtrip_in_order()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());

        Assert.Equal(HttpStatusCode.NoContent, (await PutWin(c, id,
            new WinStepDto(null, "Oświadczenie laureata", false), new WinStepDto(null, "Skan paragonu", true))).StatusCode);

        var steps = (await GetAsync(c, id))!.Win!.Steps!;
        Assert.Equal(["Oświadczenie laureata", "Skan paragonu"], steps.Select(s => s.Text));
        Assert.Equal([false, true], steps.Select(s => s.Done));
        Assert.All(steps, s => Assert.NotNull(s.Id));
    }

    [Fact]
    public async Task Put_win_keeps_step_ids_and_removes_missing()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await PutWin(c, id, new WinStepDto(null, "A", false), new WinStepDto(null, "B", false));
        var before = (await GetAsync(c, id))!.Win!.Steps!;

        var foreign = Guid.NewGuid();
        (await PutWin(c, id, before[1] with { Text = "B2" }, new WinStepDto(foreign, "C", false))).EnsureSuccessStatusCode();

        var after = (await GetAsync(c, id))!.Win!.Steps!;
        Assert.Equal(["B2", "C"], after.Select(s => s.Text));
        Assert.Equal(before[1].Id, after[0].Id);
        Assert.NotEqual(foreign, after[1].Id);
        Assert.DoesNotContain(after, s => s.Id == before[0].Id);

        (await PutWin(c, id)).EnsureSuccessStatusCode();
        Assert.Empty((await GetAsync(c, id))!.Win!.Steps!);
    }

    [Fact]
    public async Task Put_win_without_steps_field_keeps_existing_steps()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await PutWin(c, id, new WinStepDto(null, "A", false));

        var res = await c.PutAsJsonAsync($"/api/contests/{id}/win",
            new { prizeWon = "Hulajnoga", prizeValue = (decimal?)null, laureateDeadline = (string?)null, laureateDataSent = true });
        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);

        var win = (await GetAsync(c, id))!.Win!;
        Assert.Equal("Hulajnoga", win.PrizeWon);
        Assert.Equal(["A"], win.Steps!.Select(s => s.Text));
    }

    [Fact]
    public async Task Put_win_rejects_blank_or_long_step_text()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        Assert.Equal(HttpStatusCode.BadRequest, (await PutWin(c, id, new WinStepDto(null, " ", false))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PutWin(c, id, new WinStepDto(null, new string('x', 301), false))).StatusCode);
        Assert.Null((await GetAsync(c, id))!.Win);
    }

    [Fact]
    public async Task Toggle_win_step()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await PutWin(c, id, new WinStepDto(null, "A", false));
        var step = (await GetAsync(c, id))!.Win!.Steps![0];

        Assert.Equal(HttpStatusCode.NoContent,
            (await c.PatchAsJsonAsync($"/api/win-steps/{step.Id}", new ToggleDto(true), JsonConfig.Options)).StatusCode);
        Assert.True((await GetAsync(c, id))!.Win!.Steps![0].Done);
        Assert.Equal(HttpStatusCode.NotFound,
            (await c.PatchAsJsonAsync($"/api/win-steps/{Guid.NewGuid()}", new ToggleDto(true), JsonConfig.Options)).StatusCode);
    }

    [Fact]
    public async Task Toggle_win_step_other_user_404()
    {
        var owner = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(owner, Samples.Contest());
        await PutWin(owner, id, new WinStepDto(null, "A", false));
        var step = (await GetAsync(owner, id))!.Win!.Steps![0];

        var other = await factory.CreateUserClientAsync();
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PatchAsJsonAsync($"/api/win-steps/{step.Id}", new ToggleDto(true), JsonConfig.Options)).StatusCode);
        Assert.False((await GetAsync(owner, id))!.Win!.Steps![0].Done);
    }

    [Fact]
    public async Task Duplicate_does_not_copy_win_or_steps()
    {
        var c = await factory.CreateUserClientAsync();
        var id = await Samples.CreateContestAsync(c, Samples.Contest());
        await PutWin(c, id, new WinStepDto(null, "A", false));

        var res = await c.PostAsync($"/api/contests/{id}/duplicate", null);
        var newId = (await res.Content.ReadFromJsonAsync<IdDto>(JsonConfig.Options))!.Id;
        Assert.Null((await GetAsync(c, newId))!.Win);
    }
}
