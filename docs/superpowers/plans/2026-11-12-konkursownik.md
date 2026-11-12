# Konkursownik — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobilna aplikacja webowa do prowadzenia konkursów paragonowych z kontami, prywatnymi zdjęciami paragonów, przypomnieniami w aplikacji, listą zakupów i archiwum.

**Architecture:** Jedna aplikacja ASP.NET Core (.NET 10, Minimal API, EF Core + PostgreSQL) serwuje API pod `/api` oraz zbudowany frontend React z `wwwroot` — jedna domena, logowanie ciasteczkiem Identity. Zdjęcia przez abstrakcję `IPhotoStorage` (dysk lokalny lub Azure Blob). Logika dat (statusy, przypomnienia) to czyste funkcje testowane jednostkowo; endpointy testowane integracyjnie na prawdziwym Postgresie w Testcontainers.

**Tech Stack:** .NET 10, ASP.NET Core Identity, EF Core 10 + Npgsql, xUnit, Testcontainers (PostgreSql, Azurite), Microsoft.Extensions.TimeProvider.Testing, Azure.Storage.Blobs; React 19 + TypeScript + Vite, React Router 7, TanStack Query 5, Tailwind CSS 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-12-konkursownik-design.md`

---

## Część A — dla Ciebie (człowieka)

### A1. Zanim zaczniesz
Zainstaluj: **.NET 10 SDK**, **Node.js 22 LTS**, **Docker Desktop** (wymagany do testów — Testcontainers stawia w nim Postgresa), **git**. Sprawdź: `dotnet --version`, `node --version`, `docker info`.

### A2. Decyzje przyjęte domyślnie — zmień przed startem, jeśli chcesz inaczej
1. Status ustawiasz ręcznie; jedyny automat: „Zgłoszony” po dacie końca wyświetla się jako „Czekam na wyniki”.
2. Baza: PostgreSQL (nie Azure SQL) — prostszy selfhost.
3. Frontend serwowany przez tę samą aplikację .NET (zamiast osobnego Static Web Apps) — unikamy problemów z ciasteczkami między domenami, jedno wdrożenie.
4. Okna przypomnień: „kończy się” 3 dni, „termin laureata” 7 dni.
5. Licznik limitu zgłoszeń tylko informuje, nie blokuje.

### A3. Jak to uruchomić z AI
W nowej sesji Claude Code w folderze projektu: `/superpowers:subagent-driven-development docs/superpowers/plans/2026-11-12-konkursownik.md`. AI realizuje zadania po kolei, każde sprawdza osobny recenzent.

### A4. Punkty kontrolne — co sprawdzić samemu
| Po zadaniu | Co zrobić |
|---|---|
| 2 | `dotnet test` przechodzi; przeczytaj `AuthEndpoints.cs` — czy rozumiesz przepływ zaproszeń |
| 8 | Cały backend gotowy. Odpal `docker compose -f docker-compose.dev.yml up -d`, `dotnet run`, przeklikaj `Konkursownik.Api.http` w VS/Rider |
| 12 | `npm run dev` + backend; na telefonie w tej samej sieci (`npm run dev -- --host`) dodaj konkurs, zrób zdjęcie paragonu, sprawdź „Pilne” i „Zakupy” |
| 13 | Wdrożenie na Azure wg `docs/deploy.md` (kroki z Twoim kontem Azure robisz Ty — AI ich nie wykona) |

### A5. Etap 2 (osobny plan później)
PWA + powiadomienia push, przeniesienie na serwer znajomego (`docker compose` z Zadania 13 jest gotowy pod to).

---

## Global Constraints

- .NET 10 (`net10.0`), C# z `Nullable` i `TreatWarningsAsErrors` włączonymi.
- Wszystkie endpointy API pod `/api`; JSON camelCase, enumy jako stringi (`JsonStringEnumConverter`) — wspólne `JsonConfig.Options`.
- Każdy zasób należący do innego użytkownika → **404** (nigdy 403, nigdy dane).
- „Dziś” zawsze z `TimeProvider.TodayInPoland()` (strefa `Europe/Warsaw`); nigdy `DateTime.Now`.
- Daty bez godziny jako `DateOnly` (JSON `"2026-11-12"`).
- Zdjęcia: JPEG/PNG/WebP/HEIC, maks. `10 * 1024 * 1024` bajtów; nigdy publiczny URL.
- UI wyłącznie po polsku; etykiety statusów: Planowany, Kupione, Zgłoszony, Czekam na wyniki, Wygrana, Przegrana, Archiwum.
- Hasło min. 8 znaków; rejestracja wymaga kodu zaproszenia.
- Frontend mobile-first (projektuj na 375 px szerokości), dolna nawigacja: Pilne, Konkursy, Zakupy, Więcej.
- Dev: API na `http://localhost:5080`, Vite na `5173` z proxy `/api`.

## Review Focus

1. **Dostęp do cudzych danych (IDOR)** — każdy endpoint przyjmujący id (konkurs, zgłoszenie, zdjęcie, pozycja zakupu/kroku/dowodu) zwraca 404 dla obcego użytkownika. Testy: Zadania 4, 5, 6.
2. **Północ i strefa czasowa** — o 00:30 czasu polskiego (23:30 UTC) „dziś” to już nowy dzień. Testy: Zadanie 1 (`TodayInPoland`), Zadanie 7 (przypomnienia na granicy).
3. **Zdjęcia z iPhone’a i duże pliki** — HEIC przechodzi, plik > 10 MB i plik udający obraz (zły nagłówek) → 400. Testy: Zadanie 6.
4. **Ta sama nazwa sklepu wpisana różnie** — „ Biedronka ” i „biedronka” lądują w jednej grupie. Test: Zadanie 8.
5. **Kwoty z przecinkiem** — „12,50” wpisane na telefonie zapisuje się jako 12.5, a nie znika. Test: Zadanie 10 (`parseAmount`).

---

## Struktura plików

```
Konkursownik.sln
docker-compose.dev.yml            # Postgres do dev
docker-compose.yml                # selfhost: app + postgres + wolumen zdjęć (Zad. 13)
Dockerfile                        # (Zad. 13)
docs/deploy.md                    # (Zad. 13)
backend/Konkursownik.Api/
  Program.cs                      # składanie usług i endpointów
  Konkursownik.Api.http           # ręczne wywołania (uzupełniane w każdym zadaniu backendu)
  Common/   Clock.cs JsonConfig.cs UserExtensions.cs
  Data/     AppDbContext.cs  Migrations/
  Domain/   Contest.cs ContestChildren.cs Entry.cs Win.cs InviteCode.cs AppUser.cs ContestRules.cs
  Features/
    Auth/        AuthEndpoints.cs AuthDtos.cs InviteCodeGenerator.cs
    Contests/    ContestEndpoints.cs ContestDtos.cs ContestMapping.cs ContestValidation.cs
    Entries/     EntryEndpoints.cs EntryDtos.cs ItemToggleEndpoints.cs
    Photos/      IPhotoStorage.cs LocalPhotoStorage.cs AzureBlobPhotoStorage.cs PhotoEndpoints.cs ImageSignature.cs
    Reminders/   ReminderRules.cs ReminderEndpoints.cs
    ShoppingList/ShoppingListBuilder.cs ShoppingListEndpoints.cs
    Stats/       StatsEndpoints.cs
backend/Konkursownik.Tests/
  Infrastructure/ ApiFactory.cs Samples.cs
  <Feature>Tests.cs ...
frontend/
  src/api/ client.ts types.ts hooks.ts
  src/auth/ AuthProvider.tsx RequireAuth.tsx
  src/lib/ labels.ts format.ts
  src/pages/ ...Page.tsx
  src/components/ ...
```

---

### Task 1: Szkielet rozwiązania, zegar i infrastruktura testów

**Files:**
- Create: `Konkursownik.sln`, `.gitignore` (dotnet + node), `docker-compose.dev.yml`
- Create: `backend/Konkursownik.Api/Konkursownik.Api.csproj`, `Program.cs`, `Common/Clock.cs`, `Common/JsonConfig.cs`, `Data/AppDbContext.cs`, `Properties/launchSettings.json`, `appsettings.json`, `appsettings.Development.json`
- Create: `backend/Konkursownik.Tests/Konkursownik.Tests.csproj`, `Infrastructure/ApiFactory.cs`, `HealthTests.cs`, `ClockTests.cs`

**Interfaces:**
- Produces:
  - `static DateOnly TodayInPoland(this TimeProvider tp)` (`Common/Clock.cs`)
  - `static class JsonConfig { static JsonSerializerOptions Options; static void Configure(JsonSerializerOptions o); }` — Web defaults + `JsonStringEnumConverter`; używane przez `ConfigureHttpJsonOptions` i testy
  - `class AppDbContext : IdentityDbContext<AppUser>` (na razie bez własnych encji; `AppUser : IdentityUser` w `Domain/AppUser.cs`)
  - `public partial class Program;` (dla `WebApplicationFactory`)
  - `GET /api/health` → 200 `{ "status": "ok" }`
  - Config: `ConnectionStrings:Default`, `Database:MigrateOnStartup` (bool), `Invites:BootstrapCode`, `Storage:Provider` (`Local`|`AzureBlob`), `Storage:LocalPath`, `Storage:BlobConnectionString`, `Storage:BlobContainer` (domyślnie `photos`)
  - `TimeProvider` zarejestrowany jako singleton `TimeProvider.System`
  - Testy: `[Collection("api")]` + `ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime` z `PostgreSqlContainer`, `FakeTimeProvider Clock` (start `2026-11-12T10:00:00Z`), `Storage:LocalPath` = katalog tymczasowy, `Invites:BootstrapCode` = `"START"`, `Database:MigrateOnStartup` = true

- [ ] **Step 1: `git init`, `dotnet new sln -n Konkursownik`, projekty `web` (Api) i `xunit` (Tests), referencja Tests→Api, pakiety**

Api: `Microsoft.AspNetCore.Identity.EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`, `Azure.Storage.Blobs`. Tests: `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers.PostgreSql`, `Testcontainers.Azurite`, `Microsoft.Extensions.TimeProvider.Testing`. `launchSettings.json`: `http://localhost:5080`. `docker-compose.dev.yml`: `postgres:17`, port 5432, user/hasło/db `konkursownik`.

- [ ] **Step 2: Napisz testy**

```csharp
// ClockTests.cs
[Fact] public void TodayInPoland_after_midnight_local_is_next_day()
{
    var tp = new FakeTimeProvider(new DateTimeOffset(2026, 11, 12, 23, 30, 0, TimeSpan.Zero));
    Assert.Equal(new DateOnly(2026, 11, 13), tp.TodayInPoland());
}
[Fact] public void TodayInPoland_summer_time()
{
    var tp = new FakeTimeProvider(new DateTimeOffset(2026, 7, 1, 21, 59, 0, TimeSpan.Zero));
    Assert.Equal(new DateOnly(2026, 7, 1), tp.TodayInPoland());
}
// HealthTests.cs  [Collection("api")]
[Fact] public async Task Health_returns_ok()
{
    var res = await factory.CreateClient().GetAsync("/api/health");
    Assert.Equal(HttpStatusCode.OK, res.StatusCode);
}
```

- [ ] **Step 3: `dotnet test` — oczekiwane FAIL (brak `TodayInPoland`, brak endpointu)**
- [ ] **Step 4: Zaimplementuj `Clock.cs` (`TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw")` — na Windows .NET 10 obsługuje identyfikatory IANA), `JsonConfig`, `Program.cs` (DbContext z `ConnectionStrings:Default`, migracja przy starcie gdy `Database:MigrateOnStartup`), `ApiFactory`; dodaj pierwszą migrację `dotnet ef migrations add Initial`**
- [ ] **Step 5: `dotnet test` — oczekiwane PASS (3 testy)**
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold api, clock, test infrastructure"`

---

### Task 2: Konta i zaproszenia

**Files:**
- Create: `Domain/InviteCode.cs`, `Features/Auth/AuthEndpoints.cs`, `Features/Auth/AuthDtos.cs`, `Features/Auth/InviteCodeGenerator.cs`, `Common/UserExtensions.cs`
- Modify: `Data/AppDbContext.cs` (DbSet `InviteCodes`), `Program.cs`
- Create: `backend/Konkursownik.Tests/AuthTests.cs`, `BootstrapTests.cs`; Modify: `Infrastructure/ApiFactory.cs`

**Interfaces:**
- Consumes: `AppDbContext`, `AppUser`, `TimeProvider`
- Produces:
  - `InviteCode { string Code (PK); string? CreatedByUserId; string? UsedByUserId; DateTimeOffset CreatedAt; DateTimeOffset? UsedAt; }`
  - `static string InviteCodeGenerator.New()` — 8 znaków z alfabetu `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (`RandomNumberGenerator`)
  - `static string UserId(this ClaimsPrincipal user)` — `NameIdentifier`
  - `record RegisterRequest(string Email, string Password, string InviteCode)`, `record LoginRequest(string Email, string Password)`, `record MeDto(string Email)`, `record InviteDto(string Code, DateTimeOffset CreatedAt, bool Used)`
  - `POST /api/auth/register` → 200 + zalogowany (ciasteczko) | 400 `{ "error": "invalid_invite" }` | 400 ValidationProblem (Identity: email zajęty, hasło)
  - `POST /api/auth/login` → 200 | 401; `POST /api/auth/logout` → 204; `GET /api/auth/me` → 200 `MeDto` | 401
  - `POST /api/invites` (auth) → 201 `InviteDto`; `GET /api/invites` (auth) → `InviteDto[]` własne
  - Wszystkie endpointy poza `/api/health` i `/api/auth/register|login` wymagają logowania (`RequireAuthorization` na grupie); brak logowania → **401** (nie redirect)
  - Test helper: `Task<HttpClient> ApiFactory.CreateUserClientAsync(string? email = null)` — przy pierwszym wywołaniu rejestruje `seed@test.local` kodem `START`; dla każdego nowego użytkownika seed tworzy zaproszenie, nowy klient się rejestruje (email domyślnie `{Guid}@test.local`, hasło `Haslo123!`)

Zasady: kod bootstrap działa tylko, gdy w bazie jest **0** użytkowników. Kod zaproszenia jednorazowy; zużycie w tej samej transakcji co utworzenie użytkownika. Identity: `AddIdentityCore<AppUser>` + `AddSignInManager` + cookie `IdentityConstants.ApplicationScheme`, `Password.RequiredLength = 8`, pozostałe wymogi znaków wyłączone, `Lockout` domyślny, cookie `HttpOnly`, `SameSite=Lax`, `SecurePolicy=SameAsRequest`, `OnRedirectToLogin/OnRedirectToAccessDenied` → 401/403.

- [ ] **Step 1: Napisz testy**

```csharp
// BootstrapTests.cs — IClassFixture<ApiFactory> (własna, pusta baza)
[Fact] public async Task Bootstrap_code_works_once_only_when_no_users()
{
    var c1 = factory.CreateClient();
    var r1 = await c1.PostAsJsonAsync("/api/auth/register", new RegisterRequest("a@x.pl", "Haslo123!", "START"));
    Assert.Equal(HttpStatusCode.OK, r1.StatusCode);
    var r2 = await factory.CreateClient().PostAsJsonAsync("/api/auth/register", new RegisterRequest("b@x.pl", "Haslo123!", "START"));
    Assert.Equal(HttpStatusCode.BadRequest, r2.StatusCode);
}
// AuthTests.cs  [Collection("api")]
[Fact] public async Task Invalid_invite_returns_400()            // kod "ZZZZZZZZ" → 400, body error == "invalid_invite"
[Fact] public async Task Invite_is_single_use()                  // drugi register tym samym kodem → 400
[Fact] public async Task Register_logs_in_and_me_returns_email() // po register GET /api/auth/me → 200, Email == podany
[Fact] public async Task Me_anonymous_returns_401()
[Fact] public async Task Login_wrong_password_returns_401()
[Fact] public async Task Logout_then_me_returns_401()
[Fact] public async Task Short_password_returns_400()            // "abc1234" (7 znaków)
[Fact] public async Task Invites_list_shows_used_flag()          // po użyciu kodu GET /api/invites → Used == true
```

- [ ] **Step 2: `dotnet test` — FAIL**
- [ ] **Step 3: Zaimplementuj encję, migrację `AddInvites` (+ tabele Identity), endpointy, helper testowy**
- [ ] **Step 4: `dotnet test` — PASS; dopisz wywołania do `Konkursownik.Api.http`**
- [ ] **Step 5: Commit** — `feat: accounts with invite codes`

---

### Task 3: Model domeny i reguły statusu (czysta logika)

**Files:**
- Create: `Domain/Contest.cs`, `Domain/ContestChildren.cs`, `Domain/Entry.cs`, `Domain/Win.cs`, `Domain/ContestRules.cs`
- Test: `backend/Konkursownik.Tests/ContestRulesTests.cs`

**Interfaces:**
- Produces (klasy EF, `Guid Id` wszędzie, `Id = Guid.NewGuid()` w inicjalizatorze):
  - `enum ContestType { Lottery, Creative }`
  - `enum ContestStatus { Planned, Bought, Submitted, AwaitingResults, Won, Lost, Archived }`
  - `Contest { Guid Id; string OwnerId; string Name; string? Organizer; string? Url; string? RulesUrl; ContestType Type; string? PrizeDescription; decimal? PrizeValue; int? PrizeCount; DateOnly StartDate; DateOnly EndDate; DateOnly? ResultsDate; string? ResultsCheckNote; int? EntryLimitPerDay; int? EntryLimitTotal; ContestStatus Status; string? Notes; DateTimeOffset CreatedAt; List<ContestTask> Tasks; List<PurchaseItem> Purchases; List<ProofItem> Proofs; List<Entry> Entries; Win? Win; }`
  - `ContestTask { Guid Id; Guid ContestId; string Text; bool Done; int Order; }`
  - `PurchaseItem { Guid Id; Guid ContestId; string Product; string? Store; string? Quantity; bool Bought; int Order; }`
  - `ProofItem { Guid Id; Guid ContestId; string What; DateOnly? KeepUntil; string? Location; bool Discarded; int Order; }`
  - `Entry { Guid Id; Guid ContestId; Contest Contest; DateOnly Date; string? ConfirmationCode; string? ReceiptNumber; decimal? PurchaseAmount; string? ContactUsed; string? AnswerText; List<Photo> Photos; }`
  - `Photo { Guid Id; Guid EntryId; string StorageKey; string ContentType; long SizeBytes; DateTimeOffset UploadedAt; }`
  - `Win { Guid Id; Guid ContestId; string PrizeWon; decimal? PrizeValue; DateOnly? LaureateDeadline; bool LaureateDataSent; }`
  - `static class ContestRules`:
    - `ContestStatus EffectiveStatus(Contest c, DateOnly today)` — `Submitted` i `today > EndDate` → `AwaitingResults`; inaczej `c.Status`
    - `bool HasPendingLaureate(Contest c)` — `Win != null && Win.LaureateDeadline != null && !Win.LaureateDataSent`
    - `bool IsArchived(Contest c)` — `Archived` lub `Lost`, lub `Won && !HasPendingLaureate(c)`
    - `int EntriesOn(Contest c, DateOnly day)` — liczba zgłoszeń z `Date == day`

- [ ] **Step 1: Napisz testy**

```csharp
[Theory]
[InlineData(ContestStatus.Submitted, "2026-11-12", ContestStatus.Submitted)]        // dzień końca
[InlineData(ContestStatus.Submitted, "2026-11-13", ContestStatus.AwaitingResults)]
[InlineData(ContestStatus.Bought,    "2026-11-13", ContestStatus.Bought)]
[InlineData(ContestStatus.Won,       "2026-12-01", ContestStatus.Won)]
public void EffectiveStatus(ContestStatus stored, string today, ContestStatus expected)
    => Assert.Equal(expected, ContestRules.EffectiveStatus(C(stored, end: "2026-11-12"), DateOnly.Parse(today)));

[Fact] public void Won_with_pending_laureate_is_not_archived()
    // Win{ LaureateDeadline = 2026-11-20, LaureateDataSent = false } → IsArchived == false; po LaureateDataSent = true → true
[Fact] public void Won_without_deadline_is_archived()
[Fact] public void Lost_and_Archived_are_archived_Planned_is_not()
[Fact] public void EntriesOn_counts_only_that_day()
```
(`C(...)` — prywatny helper w klasie testowej budujący `Contest`.)

- [ ] **Step 2: `dotnet test --filter ContestRulesTests` — FAIL**
- [ ] **Step 3: Zaimplementuj encje i `ContestRules`**
- [ ] **Step 4: `dotnet test --filter ContestRulesTests` — PASS**
- [ ] **Step 5: Commit** — `feat: contest domain model and status rules`

---

### Task 4: Konkursy — zapis, odczyt, listy aktywne/archiwum

**Files:**
- Create: `Features/Contests/ContestEndpoints.cs`, `ContestDtos.cs`, `ContestMapping.cs`, `ContestValidation.cs`
- Modify: `Data/AppDbContext.cs` (DbSety, relacje z kaskadą, `decimal(10,2)`, indeks `Contest.OwnerId`), `Program.cs`
- Create: migracja `Contests`; `backend/Konkursownik.Tests/Infrastructure/Samples.cs`, `ContestEndpointTests.cs`

**Interfaces:**
- Consumes: encje i `ContestRules` (Task 3), `UserId()` (Task 2), `TodayInPoland()` (Task 1)
- Produces:
  - `record TaskDto(Guid? Id, string Text, bool Done)`; `record PurchaseDto(Guid? Id, string Product, string? Store, string? Quantity, bool Bought)`; `record ProofDto(Guid? Id, string What, DateOnly? KeepUntil, string? Location, bool Discarded)` — `Order` = indeks w liście
  - `record ContestUpsertDto(string Name, string? Organizer, string? Url, string? RulesUrl, ContestType Type, string? PrizeDescription, decimal? PrizeValue, int? PrizeCount, DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, string? ResultsCheckNote, int? EntryLimitPerDay, int? EntryLimitTotal, ContestStatus Status, string? Notes, List<TaskDto> Tasks, List<PurchaseDto> Purchases, List<ProofDto> Proofs)`
  - `record EntryDto(Guid Id, DateOnly Date, string? ConfirmationCode, string? ReceiptNumber, decimal? PurchaseAmount, string? ContactUsed, string? AnswerText, List<Guid> PhotoIds)`
  - `record WinDto(string PrizeWon, decimal? PrizeValue, DateOnly? LaureateDeadline, bool LaureateDataSent)`
  - `record ContestDto(Guid Id, <wszystkie pola ContestUpsertDto z listami TaskDto/PurchaseDto/ProofDto z Id>, ContestStatus EffectiveStatus, List<EntryDto> Entries, WinDto? Win, int EntriesToday)` — zgłoszenia malejąco po dacie
  - `record ContestSummaryDto(Guid Id, string Name, DateOnly EndDate, DateOnly? ResultsDate, ContestStatus Status, ContestStatus EffectiveStatus, int EntryCount, int? EntryLimitTotal)`
  - `record IdDto(Guid Id)`
  - `static ContestDto ContestMapping.ToDto(Contest c, DateOnly today)`
  - `static Dictionary<string,string[]> ContestValidation.Validate(ContestUpsertDto d)` — pusty = OK. Reguły: `Name` niepusty ≤ 200; `EndDate >= StartDate`; `ResultsDate` null lub `>= StartDate`; limity null lub > 0; `PrizeValue` null lub ≥ 0; `Text`/`Product`/`What` niepuste ≤ 300
  - `GET /api/contests?view=active|archive` (domyślnie active) → `ContestSummaryDto[]`; active rosnąco po `EndDate`, archive malejąco
  - `GET /api/contests/{id}` → `ContestDto` | 404
  - `POST /api/contests` → 201 `IdDto` | 400 ValidationProblem
  - `PUT /api/contests/{id}` → 204 | 400 | 404 — podmienia listy dzieci: elementy z `Id` istniejącym w tym konkursie są aktualizowane, bez `Id` dodawane, brakujące usuwane
  - `DELETE /api/contests/{id}` → 204 | 404
  - Wszystkie zapytania: `Where(c => c.OwnerId == user.UserId())`
  - Test helper `Samples.Contest(string name = "Test", string start = "2026-11-01", string end = "2026-11-30", ContestStatus status = ContestStatus.Planned, string? resultsDate = null, string[]? tasks = null, (string Product, string? Store)[]? purchases = null, ProofDto[]? proofs = null) → ContestUpsertDto`; `Task<Guid> Samples.CreateContestAsync(HttpClient c, ContestUpsertDto d)`

- [ ] **Step 1: Napisz testy**

```csharp
[Fact] public async Task Create_then_get_roundtrips_children_in_order()
{
    var c = await factory.CreateUserClientAsync();
    var id = await Samples.CreateContestAsync(c, Samples.Contest(tasks: ["Zarejestruj kod", "Wyślij SMS"]));
    var got = await c.GetFromJsonAsync<ContestDto>($"/api/contests/{id}", JsonConfig.Options);
    Assert.Equal(["Zarejestruj kod", "Wyślij SMS"], got!.Tasks.Select(t => t.Text));
}
[Fact] public async Task Put_updates_keeps_ids_and_removes_missing_children()
    // utwórz z 2 krokami; PUT z pierwszym (z Id, Done=true) + nowym bez Id → 2 kroki, pierwszy zachował Id i Done, drugi stary zniknął
[Fact] public async Task End_before_start_returns_400()
[Fact] public async Task Other_users_contest_returns_404_for_get_put_delete()
[Fact] public async Task List_shows_only_own_contests()
[Fact] public async Task Archive_view_contains_lost_and_archived_only()
    // Planned, Lost, Archived → active: [Planned]; archive: [Lost, Archived]
[Fact] public async Task Submitted_after_end_has_effective_status_awaiting()
    // end = "2026-11-10" (zegar fabryki: 2026-11-12) → EffectiveStatus == AwaitingResults
[Fact] public async Task Delete_removes_contest()
[Fact] public async Task Anonymous_returns_401()
```

- [ ] **Step 2: `dotnet test --filter ContestEndpointTests` — FAIL**
- [ ] **Step 3: Zaimplementuj mapowanie EF, migrację, endpointy, `Samples`**
- [ ] **Step 4: `dotnet test` — PASS (wszystkie)**
- [ ] **Step 5: Commit** — `feat: contest CRUD with active and archive views`

---

### Task 5: Zgłoszenia, wygrana i szybkie odhaczanie

**Files:**
- Create: `Features/Entries/EntryEndpoints.cs`, `EntryDtos.cs`, `ItemToggleEndpoints.cs`
- Modify: `Program.cs`
- Test: `backend/Konkursownik.Tests/EntryEndpointTests.cs`, `ItemToggleTests.cs`

**Interfaces:**
- Consumes: encje (Task 3), `EntryDto`, `WinDto`, `IdDto`, `Samples` (Task 4)
- Produces:
  - `record EntryUpsertDto(DateOnly Date, string? ConfirmationCode, string? ReceiptNumber, decimal? PurchaseAmount, string? ContactUsed, string? AnswerText)` — walidacja: `PurchaseAmount` null lub ≥ 0, `AnswerText` ≤ 5000, pozostałe teksty ≤ 200
  - `POST /api/contests/{id}/entries` → 201 `IdDto` | 404; `PUT /api/entries/{id}` → 204 | 404; `DELETE /api/entries/{id}` → 204 | 404
  - `PUT /api/contests/{id}/win` (`WinDto`) → 204; tworzy lub aktualizuje wygraną **i ustawia `Status = Won`**; `DELETE /api/contests/{id}/win` → 204 (status bez zmian)
  - `record ToggleDto(bool Value)`; `PATCH /api/contest-tasks/{id}` (Done), `PATCH /api/purchase-items/{id}` (Bought), `PATCH /api/proof-items/{id}` (Discarded) → 204 | 404 — własność sprawdzana przez `Contest.OwnerId`

- [ ] **Step 1: Napisz testy**

```csharp
[Fact] public async Task Add_entry_appears_in_contest_and_counts_today()
    // zgłoszenia z datą 2026-11-12 i 2026-11-11 → Entries.Count == 2, EntriesToday == 1
[Fact] public async Task Update_and_delete_entry()
[Fact] public async Task Other_users_entry_returns_404_for_put_and_delete()
[Fact] public async Task Add_entry_to_other_users_contest_returns_404()
[Fact] public async Task Put_win_sets_status_won()
[Fact] public async Task Delete_win_removes_it()
// ItemToggleTests
[Fact] public async Task Toggle_task_purchase_proof()               // każdy PATCH true → GET pokazuje true
[Fact] public async Task Toggle_other_users_item_returns_404()
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `dotnet test` — PASS**
- [ ] **Step 5: Commit** — `feat: entries, win and item toggles`

---

### Task 6: Zdjęcia paragonów i opakowań

**Files:**
- Create: `Features/Photos/IPhotoStorage.cs`, `LocalPhotoStorage.cs`, `AzureBlobPhotoStorage.cs`, `ImageSignature.cs`, `PhotoEndpoints.cs`
- Modify: `Program.cs` (wybór storage wg `Storage:Provider`), `Features/Entries/EntryEndpoints.cs` i `Features/Contests/ContestEndpoints.cs` (DELETE usuwa pliki)
- Test: `backend/Konkursownik.Tests/PhotoStorageContractTests.cs`, `PhotoEndpointTests.cs`, `ImageSignatureTests.cs`

**Interfaces:**
- Consumes: `Entry`, `Photo` (Task 3); endpointy usuwania (Task 4, 5)
- Produces:
  - `interface IPhotoStorage { Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct); Task<Stream?> OpenReadAsync(string key, CancellationToken ct); Task DeleteAsync(string key, CancellationToken ct); }` — `DeleteAsync` nieistniejącego klucza nie rzuca
  - `LocalPhotoStorage(string rootPath)`; `AzureBlobPhotoStorage(BlobContainerClient container)` — kontener tworzony z `PublicAccessType.None`
  - Klucz: `"{ownerId}/{photoId:N}"`
  - `static string? ImageSignature.Detect(ReadOnlySpan<byte> header)` → `"image/jpeg"` (`FF D8 FF`), `"image/png"` (`89 50 4E 47 0D 0A 1A 0A`), `"image/webp"` (`RIFF` @0 + `WEBP` @8), `"image/heic"` (`ftyp` @4 + marka `heic|heix|mif1|msf1` @8), inaczej `null`
  - `POST /api/entries/{id}/photos` (multipart, pole `file`) → 201 `IdDto` | 400 `{ "error": "too_large" | "unsupported_type" }` | 404. Typ zapisywany z `ImageSignature`, nie z nagłówka klienta. Limit `10 * 1024 * 1024`; `RequestSizeLimit` endpointu 11 MB.
  - `GET /api/photos/{id}` → plik z zapisanym `ContentType`, nagłówki `Cache-Control: private, max-age=86400`, `X-Content-Type-Options: nosniff` | 404
  - `DELETE /api/photos/{id}` → 204 | 404

- [ ] **Step 1: Napisz testy**

```csharp
// PhotoStorageContractTests.cs — abstract class PhotoStorageContract { protected abstract Task<IPhotoStorage> CreateAsync(); }
// podklasy: LocalStorageTests (katalog tymczasowy), AzuriteStorageTests (AzuriteContainer)
[Fact] public async Task Save_then_read_returns_same_bytes()
[Fact] public async Task Read_missing_returns_null()
[Fact] public async Task Delete_missing_does_not_throw()
// ImageSignatureTests.cs
[Theory] // jpeg, png, webp, heic → odpowiedni typ; "GIF89a" i "%PDF" → null
// PhotoEndpointTests.cs
[Fact] public async Task Upload_then_download_returns_same_bytes_and_type()
[Fact] public async Task Heic_upload_is_accepted()
[Fact] public async Task Over_10MB_returns_400_too_large()           // 10 * 1024 * 1024 + 1 bajtów z nagłówkiem JPEG
[Fact] public async Task Fake_image_returns_400_unsupported_type()  // treść "%PDF-1.7", Content-Type image/jpeg
[Fact] public async Task Other_users_photo_returns_404_for_get_and_delete()
[Fact] public async Task Deleting_entry_deletes_photo_file()        // po DELETE entry: storage.OpenReadAsync(key) == null
[Fact] public async Task Deleting_contest_deletes_photo_files()
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `dotnet test` — PASS**
- [ ] **Step 5: Commit** — `feat: private receipt photos with local and blob storage`

---

### Task 7: Przypomnienia („Pilne”)

**Files:**
- Create: `Features/Reminders/ReminderRules.cs`, `ReminderEndpoints.cs`
- Modify: `Program.cs`
- Test: `backend/Konkursownik.Tests/ReminderRulesTests.cs`, `ReminderEndpointTests.cs`

**Interfaces:**
- Consumes: `Contest` + dzieci, `ContestRules` (Task 3)
- Produces:
  - `enum ReminderKind { EndingSoon, Ended, ResultsDue, LaureateDeadline, ProofDisposable }`
  - `record Reminder(ReminderKind Kind, Guid ContestId, string ContestName, DateOnly DueDate, Guid? ItemId, string? ItemText)` — dla `ProofDisposable`: `ItemId` = `ProofItem.Id`, `ItemText` = `What`, `DueDate` = `KeepUntil`
  - `static IReadOnlyList<Reminder> ReminderRules.For(IEnumerable<Contest> contests, DateOnly today)` — reguły z tabeli w specyfikacji §5 (okna: `EndingSoon` `today ≤ EndDate ≤ today+3`; `LaureateDeadline` `deadline ≤ today+7`, także zaległe); wynik rosnąco po `DueDate`, potem po `Kind`
  - `GET /api/reminders` → `Reminder[]` dla zalogowanego (ładuje konkursy z `Proofs` i `Win`)

- [ ] **Step 1: Napisz testy** (dziś = 2026-11-12)

```csharp
[Theory] [InlineData("2026-11-12", true)] [InlineData("2026-11-15", true)] [InlineData("2026-11-16", false)]
public void EndingSoon_window(string end, bool expected)   // status Planned
[Fact] public void EndingSoon_not_for_submitted()
[Fact] public void Ended_when_planned_or_bought_and_end_passed()   // end 2026-11-11 → Ended
[Theory] [InlineData("2026-11-12", true)] [InlineData("2026-11-01", true)] [InlineData("2026-11-13", false)]
public void ResultsDue(string results, bool expected)      // status Submitted, end 2026-11-05
[Fact] public void No_results_date_no_reminder_and_no_crash()
[Theory] [InlineData("2026-11-19", true)] [InlineData("2026-11-20", false)] [InlineData("2026-11-01", true)]
public void LaureateDeadline_window(string deadline, bool expected)
[Fact] public void Laureate_sent_no_reminder()
[Theory] [InlineData("2026-11-11", true)] [InlineData("2026-11-12", false)]
public void ProofDisposable(string keepUntil, bool expected)
[Fact] public void Proof_discarded_or_without_date_no_reminder()
[Fact] public void Proof_in_archived_contest_still_reminds()
[Fact] public void Sorted_by_due_date()
// ReminderEndpointTests
[Fact] public async Task Returns_only_own_reminders()
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `dotnet test` — PASS**
- [ ] **Step 5: Commit** — `feat: in-app reminders`

---

### Task 8: Lista zakupów, duplikowanie, statystyki

**Files:**
- Create: `Features/ShoppingList/ShoppingListBuilder.cs`, `ShoppingListEndpoints.cs`, `Features/Stats/StatsEndpoints.cs`
- Modify: `Features/Contests/ContestEndpoints.cs` (duplikowanie), `Program.cs`
- Test: `ShoppingListBuilderTests.cs`, `ShoppingListEndpointTests.cs`, `DuplicateTests.cs`, `StatsTests.cs`

**Interfaces:**
- Consumes: encje, `ContestRules.IsArchived` (Task 3), `Samples` (Task 4), toggle `PATCH /api/purchase-items/{id}` (Task 5)
- Produces:
  - `record ShoppingItemDto(Guid Id, Guid ContestId, string ContestName, string Product, string? Quantity)`; `record ShoppingGroupDto(string Store, List<ShoppingItemDto> Items)`
  - `static List<ShoppingGroupDto> ShoppingListBuilder.Build(IEnumerable<Contest> contests, DateOnly today)` — pozycje `!Bought` z konkursów `!IsArchived && EndDate >= today`; klucz grupy `Store?.Trim().ToLowerInvariant()`, nazwa grupy = pierwsza napotkana przycięta pisownia; pusty/null → `"Dowolny sklep"`; grupy alfabetycznie (`pl-PL`), „Dowolny sklep” na końcu
  - `GET /api/shopping-list` → `ShoppingGroupDto[]`
  - `POST /api/contests/{id}/duplicate` → 201 `IdDto` | 404 — kopia: `Name + " (kopia)"`, `Status = Planned`, kroki/zakupy/dowody z `Done/Bought/Discarded = false`, bez zgłoszeń i wygranej
  - `record StatsDto(int Contests, int Entries, int Wins, decimal TotalSpent, decimal TotalWonValue)`; `GET /api/stats` — `TotalSpent` = suma `Entry.PurchaseAmount`, `TotalWonValue` = suma `Win.PrizeValue`, `Wins` = konkursy z `Win != null`

- [ ] **Step 1: Napisz testy**

```csharp
[Fact] public void Same_store_different_spelling_grouped()
    // " Biedronka " i "biedronka" → 1 grupa "Biedronka", 2 pozycje
[Fact] public void Missing_store_goes_to_last_group_dowolny_sklep()
[Fact] public void Excludes_bought_archived_and_ended_contests()
[Fact] public void Groups_sorted_alphabetically_polish()          // "Żabka" po "Lidl"
[Fact] public async Task Endpoint_returns_only_own_items_and_toggle_removes_item()
[Fact] public async Task Duplicate_copies_lists_resets_flags_skips_entries_and_win()
[Fact] public async Task Duplicate_other_users_contest_returns_404()
[Fact] public async Task Stats_sums_spent_and_won()
    // 2 zgłoszenia 12.50 + 7.49, wygrana 100 → TotalSpent 19.99, TotalWonValue 100, Wins 1
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `dotnet test` — PASS; uzupełnij `Konkursownik.Api.http` o wszystkie endpointy**
- [ ] **Step 5: Commit** — `feat: shopping list, duplicate, stats`

---

### Task 9: Frontend — szkielet, logowanie, serwowanie przez API

**Files:**
- Create: `frontend/` (`npm create vite@latest frontend -- --template react-ts`), `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/api/client.ts`, `src/api/types.ts`, `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx`, `src/components/Layout.tsx`, `src/components/BottomNav.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`
- Modify: `backend/Konkursownik.Api/Program.cs` (`UseDefaultFiles`, `UseStaticFiles`, `MapFallbackToFile("index.html")` dla ścieżek spoza `/api`)
- Test: `src/api/client.test.ts`, `src/pages/RegisterPage.test.tsx`

**Interfaces:**
- Consumes: kontrakty z Tasków 2–8 (typy TS 1:1 z rekordami C#, enumy jako unie stringów)
- Produces:
  - `class ApiError extends Error { status: number; code?: string }` (`code` z pola `error` w body)
  - `apiFetch<T>(path: string, init?: RequestInit): Promise<T>` — `credentials: "same-origin"`, JSON domyślnie, 204 → `undefined`, nie-2xx → `ApiError`
  - `useAuth(): { user: MeDto | null; loading: boolean; login(email, password): Promise<void>; register(email, password, inviteCode): Promise<void>; logout(): Promise<void> }`
  - Trasy: `/login`, `/register`, a za `RequireAuth` + `Layout`: `/` (Pilne), `/konkursy`, `/konkursy/nowy`, `/konkursy/:id`, `/konkursy/:id/edycja`, `/zakupy`, `/wiecej` (strony z Tasków 10–12; tu puste zaślepki z nagłówkiem)
  - Komunikaty: `invalid_invite` → „Nieprawidłowy lub zużyty kod zaproszenia”; 401 przy logowaniu → „Nieprawidłowy e-mail lub hasło”
  - Pakiety: `react-router`, `@tanstack/react-query`, `tailwindcss`, `@tailwindcss/vite`; dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
  - `vite.config.ts`: proxy `/api` → `http://localhost:5080`; `build.outDir` = `../backend/Konkursownik.Api/wwwroot`, `emptyOutDir: true`; `wwwroot/` w `.gitignore`

- [ ] **Step 1: Napisz testy**

```ts
// client.test.ts
it("throws ApiError with status and code", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "invalid_invite" }), { status: 400 })));
  await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 400, code: "invalid_invite" });
});
it("returns undefined for 204", async () => { /* status 204 → undefined */ });
// RegisterPage.test.tsx
it("shows invite error message", async () => {
  // fetch → 400 {error:"invalid_invite"}; wypełnij formularz, kliknij "Załóż konto"
  expect(await screen.findByText("Nieprawidłowy lub zużyty kod zaproszenia")).toBeInTheDocument();
});
```

- [ ] **Step 2: `npm test` — FAIL** · **Step 3: Zaimplementuj** · **Step 4: `npm test` — PASS; `npm run build` tworzy `wwwroot/index.html`; `dotnet run` → `http://localhost:5080/` pokazuje ekran logowania**
- [ ] **Step 5: Commit** — `feat(frontend): scaffold, auth pages, served by api`

---

### Task 10: Frontend — lista konkursów i formularz

**Files:**
- Create: `src/lib/labels.ts`, `src/lib/format.ts`, `src/api/hooks.ts`, `src/pages/ContestsPage.tsx`, `src/pages/ContestFormPage.tsx`, `src/components/EditableList.tsx`
- Test: `src/lib/format.test.ts`, `src/lib/labels.test.ts`, `src/pages/ContestFormPage.test.tsx`

**Interfaces:**
- Consumes: `apiFetch`, typy (Task 9); endpointy konkursów (Task 4)
- Produces:
  - `statusLabel: Record<ContestStatus, string>` (etykiety z Global Constraints), `typeLabel: Record<ContestType, string>` = `{ Lottery: "Loteria", Creative: "Zadanie konkursowe" }`
  - `parseAmount(input: string): number | null` — przecinek lub kropka, spacje usuwane, pusty → `null`, niepoprawny → `NaN`
  - `formatDate(d: string): string` → `"12.11.2026"`; `formatMoney(n: number): string` → `"12,50 zł"` (`Intl.NumberFormat("pl-PL")`)
  - Hooki TanStack Query: `useContests(view)`, `useContest(id)`, `useSaveContest()`, `useDeleteContest()` — po zapisie unieważniają `["contests"]`, `["reminders"]`, `["shopping"]`
  - `ContestsPage`: zakładki „Aktywne” / „Archiwum”, karta = nazwa, status (efektywny), „do {data końca}”, licznik `entryCount` lub `entryCount/entryLimitTotal`; przycisk „+ Nowy konkurs”
  - `ContestFormPage`: sekcje Podstawowe / Nagroda / Daty / Limity / Do zrobienia / Do kupienia / Do zachowania / Notatki; `EditableList` (dodaj, usuń, przesuń w górę) dla trzech list; walidacja klienta = te same reguły co `ContestValidation`, komunikat dla dat: „Data końca nie może być przed datą startu”

- [ ] **Step 1: Napisz testy**

```ts
it.each([["12,50", 12.5], ["12.50", 12.5], [" 1 200,00 ", 1200], ["", null]])("parseAmount(%s)", (i, o) => expect(parseAmount(i)).toBe(o));
it("parseAmount invalid → NaN", () => expect(parseAmount("abc")).toBeNaN());
it("formatMoney", () => expect(formatMoney(12.5)).toBe("12,50 zł"));   // uwaga: Intl używa twardej spacji — porównuj po .replace(/\s/g," ")
it("every status has a label", () => expect(Object.keys(statusLabel)).toHaveLength(7));
it("form blocks end before start", async () => { /* start 2026-11-10, koniec 2026-11-01 → komunikat, fetch nie wywołany */ });
it("form submits purchases with store and amount as number", async () => { /* PrizeValue "99,99" → body.prizeValue === 99.99 */ });
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(frontend): contest list and form`

---

### Task 11: Frontend — szczegóły konkursu, zgłoszenia, zdjęcia, wygrana

**Files:**
- Create: `src/pages/ContestDetailsPage.tsx`, `src/components/EntryForm.tsx`, `src/components/PhotoPicker.tsx`, `src/components/WinForm.tsx`, `src/components/ChecklistSection.tsx`
- Modify: `src/lib/format.ts`, `src/api/hooks.ts`
- Test: `src/lib/format.test.ts`, `src/components/PhotoPicker.test.tsx`

**Interfaces:**
- Consumes: endpointy z Tasków 4–6 i 8 (duplikuj), `parseAmount`, `formatDate`, `formatMoney`
- Produces:
  - `formatEntryCounter(entryCount: number, limitTotal: number | null, entriesToday: number, limitPerDay: number | null): string` — np. `"3/5 · dziś 1/1"`, `"3"` bez limitów, `"3/5"`, `"dziś 1/1"` gdy tylko dzienny (wtedy `"3 · dziś 1/1"`)
  - Hooki: `useToggleItem(kind: "contest-tasks" | "purchase-items" | "proof-items")`, `useSaveEntry()`, `useDeleteEntry()`, `useUploadPhoto()`, `useDeletePhoto()`, `useSaveWin()`, `useDeleteWin()`, `useDuplicateContest()`
  - `ContestDetailsPage`: nagłówek (nazwa, status, daty, linki strona/regulamin otwierane w nowej karcie), licznik zgłoszeń, sekcje z odhaczaniem (`ChecklistSection`), lista zgłoszeń z miniaturami (`<img src="/api/photos/{id}">`), „+ Zgłoszenie”, „Wygrana”, menu: Edytuj / Duplikuj / Usuń (z potwierdzeniem „Usunąć konkurs razem ze zdjęciami?”)
  - `PhotoPicker`: `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment">`; plik > 10 MB odrzucany przed wysłaniem z komunikatem „Zdjęcie jest za duże (maks. 10 MB)”; błędy API `too_large`/`unsupported_type` → „Zdjęcie jest za duże (maks. 10 MB)” / „Nieobsługiwany format zdjęcia”

- [ ] **Step 1: Napisz testy**

```ts
it.each([
  [3, 5, 1, 1, "3/5 · dziś 1/1"], [3, null, 0, null, "3"], [3, 5, 0, null, "3/5"], [3, null, 1, 1, "3 · dziś 1/1"],
])("formatEntryCounter", (a, b, c, d, out) => expect(formatEntryCounter(a, b, c, d)).toBe(out));
it("PhotoPicker rejects >10MB without upload", async () => { /* File o rozmiarze 10*1024*1024+1 → komunikat, fetch nie wywołany */ });
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `npm test` — PASS**
- [ ] **Step 5: Commit** — `feat(frontend): contest details, entries, photos, win`

---

### Task 12: Frontend — Pilne, Zakupy, Więcej

**Files:**
- Create: `src/pages/RemindersPage.tsx`, `src/pages/ShoppingPage.tsx`, `src/pages/MorePage.tsx`, `src/lib/reminders.ts`
- Modify: `src/api/hooks.ts`
- Test: `src/lib/reminders.test.ts`, `src/pages/ShoppingPage.test.tsx`

**Interfaces:**
- Consumes: `GET /api/reminders` (Task 7), `GET /api/shopping-list`, `GET /api/stats` (Task 8), `/api/invites` (Task 2), `useToggleItem` (Task 11)
- Produces:
  - `reminderText(r: Reminder): string` — dokładnie: `EndingSoon` → `"Kończy się {formatDate} — zgłoś się"`, `Ended` → `"Konkurs się zakończył — zaktualizuj status"`, `ResultsDue` → `"Wyniki: {formatDate} — sprawdź maila"`, `LaureateDeadline` → `"Termin danych laureata: {formatDate}"`, `ProofDisposable` → `"Możesz wyrzucić: {itemText}"`
  - `RemindersPage` (`/`): lista kart (nazwa konkursu + `reminderText`), klik → `/konkursy/:id`; dla `ProofDisposable` przycisk „Wyrzucone” (PATCH proof-items `true`); pusty stan: „Nic pilnego. Wszystko pod kontrolą!”; liczba przypomnień jako plakietka na „Pilne” w `BottomNav`
  - `ShoppingPage` (`/zakupy`): grupy ze sklepem w nagłówku, pozycja = checkbox + produkt + ilość + nazwa konkursu; odhaczenie → PATCH purchase-items `true`, pozycja znika; pusty stan: „Lista zakupów jest pusta”
  - `MorePage` (`/wiecej`): statystyki (`formatMoney`), zaproszenia (przycisk „Wygeneruj kod”, lista kodów z „zużyty”/„wolny”, kopiowanie do schowka), „Wyloguj”

- [ ] **Step 1: Napisz testy**

```ts
it("reminderText for each kind", () => {
  expect(reminderText({ kind: "ResultsDue", dueDate: "2026-11-12", ... })).toBe("Wyniki: 12.11.2026 — sprawdź maila");
  expect(reminderText({ kind: "ProofDisposable", itemText: "Paragon Biedronka", ... })).toBe("Możesz wyrzucić: Paragon Biedronka");
  // + pozostałe 3 rodzaje
});
it("ShoppingPage renders groups and removes item after check", async () => { /* 2 grupy; klik checkbox → PATCH wywołany, pozycja znika */ });
```

- [ ] **Step 2: FAIL** · **Step 3: Zaimplementuj** · **Step 4: `npm test` — PASS; ręcznie na telefonie wg A4**
- [ ] **Step 5: Commit** — `feat(frontend): reminders, shopping list, more page`

---

### Task 13: Docker, selfhost i instrukcja wdrożenia na Azure

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docs/deploy.md`
- Modify: `backend/Konkursownik.Api/Program.cs` (`UseForwardedHeaders` dla proxy/App Service), `appsettings.json` (domyślne `Storage:Provider=Local`, `Storage:LocalPath=/data/photos`)

**Interfaces:**
- Consumes: całość
- Produces:
  - `Dockerfile` wieloetapowy: `node:22` → `npm ci && npm run build` (do `wwwroot`), `mcr.microsoft.com/dotnet/sdk:10.0` → `dotnet publish -c Release`, runtime `mcr.microsoft.com/dotnet/aspnet:10.0`, port 8080, użytkownik nie-root
  - `docker-compose.yml`: `app` (build, port `8080:8080`, `Database__MigrateOnStartup=true`, `Invites__BootstrapCode` z `.env`, wolumen `photos:/data/photos`), `db` (`postgres:17`, wolumen `pgdata`); `.env.example` z `POSTGRES_PASSWORD` i `BOOTSTRAP_CODE`
  - Data Protection keys zapisywane w wolumenie (`/data/keys`) — inaczej po restarcie kontenera wszyscy są wylogowani
  - `docs/deploy.md` (po polsku, dla człowieka): (1) Postgres — Neon (darmowy) albo Azure Database for PostgreSQL; (2) Storage Account + prywatny kontener `photos`; (3) App Service (Linux, .NET 10) — `az webapp up` lub publikacja z VS, ustawienia aplikacji `ConnectionStrings__Default`, `Storage__Provider=AzureBlob`, `Storage__BlobConnectionString`, `Invites__BootstrapCode`, `Database__MigrateOnStartup=true`, HTTPS only; (4) pierwsze konto kodem bootstrap, potem usuń `Invites__BootstrapCode`; (5) selfhost: `cp .env.example .env`, `docker compose up -d --build`, reverse proxy z HTTPS (np. Caddy); (6) kopia zapasowa: `pg_dump` + katalog zdjęć

- [ ] **Step 1: Napisz test dymny jako skrypt** `scripts/smoke.sh`: `docker compose up -d --build`; czekaj na `GET /api/health` = 200; `POST /api/auth/register` z kodem z `.env` = 200; `GET /` zawiera `<div id="root">`; `docker compose down -v`
- [ ] **Step 2: Uruchom `bash scripts/smoke.sh` — FAIL (brak Dockerfile)**
- [ ] **Step 3: Zaimplementuj pliki**
- [ ] **Step 4: `bash scripts/smoke.sh` — wszystkie kroki OK; `dotnet test` i `npm test` nadal PASS**
- [ ] **Step 5: Commit** — `chore: docker, selfhost compose, azure deploy guide`
