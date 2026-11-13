# Wiele nagród, konto administratora, podpisy pól — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lista nagród przy konkursie (dane, AI, UI), jedno konto administratora z konfiguracji z wyłącznym prawem do zaproszeń, logowanie nickiem, podpisane pola list w formularzu.

**Architecture:** Kontynuacja gałęzi `feat/redesign`. Backend: nowa encja `ContestPrize` z migracją przenoszącą dotychczasową nagrodę, `Win.PrizeId`, rola `Admin` zakładana przy starcie z konfiguracji, nicki w Identity. Frontend: nowe typy, lista nagród w formularzu, wybór nagrody przy wygranej, podpisy pól, ekran zaproszeń tylko dla administratora.

**Tech Stack:** jak dotąd (.NET 10, EF Core 10 + Npgsql, ASP.NET Identity z rolami, xUnit + Testcontainers; React 19, TS, TanStack Query, Tailwind 4, Vitest).

**Spec:** `docs/superpowers/specs/2026-11-14-nagrody-admin-podpisy-design.md` (oraz `docs/superpowers/specs/2026-11-13-redesign-i-ai-design.md`).

## Global Constraints

- Zasady poprzednich specyfikacji: cudzy zasób po id → 404; „dziś” = `TodayInPoland()`; AI tylko wypełnia formularz; brak zmyślonych treści; UI po polsku; cele dotyku ≥ 44 px.
- Nagroda: `Name` wymagana ≤ 200; `Value` null lub ≥ 0; `Count` null lub > 0.
- Nick: 3–32 znaki, `a–z A–Z 0–9 . _ -`, unikalny bez rozróżniania wielkości liter; istniejące loginy-e-maile dalej działają przy logowaniu.
- Konfiguracja administratora: `Admin:UserName`, `Admin:Password` (env `Admin__UserName`, `Admin__Password`; w `.env` `ADMIN_USERNAME`, `ADMIN_PASSWORD`). Hasło ze zmiennych tylko przy zakładaniu konta. Usunięte: `Invites:BootstrapCode`, `BOOTSTRAP_CODE`.
- Zaproszenia: `POST/GET /api/invites` tylko rola `Admin`, inni → 403.
- Podpisy pól dokładnie jak w spec §6.
- Pakiety EF/ASP.NET na 10.0.x.

## Review Focus

1. **Migracja gubi nagrodę istniejącego konkursu** — konkurs z `PrizeDescription`/`PrizeValue`/`PrizeCount` po migracji ma dokładnie jedną nagrodę z tymi wartościami; konkurs bez nagrody nie dostaje pustej. Test: Task 1 (`Migration_moves_single_prize`).
2. **Stare konto nie może się zalogować** — konto, którego `UserName` to e-mail, loguje się nim po zmianie na nicki. Test: Task 4.
3. **Zapis formularza gubi nagrody lub `PrizeId` wygranej** — edycja konkursu w UI round-tripuje nagrody z id; usunięcie wybranej nagrody zeruje `PrizeId`, a tekst i wartość wygranej zostają. Testy: Task 1, Task 2, Task 5.
4. **Brak konfiguracji administratora** — aplikacja startuje, rejestracja bez kodu niemożliwa, zaproszeń nie da się wygenerować (403), w logach ostrzeżenie. Test: Task 4.
5. **AI zwraca nagrody bez nazwy / z ujemną wartością / z liczbą 0** — pozycje bez nazwy pominięte, złe wartości → null, nigdy 500. Test: Task 3.

---

### Task 1: Encja nagród, migracja z przeniesieniem danych, API konkursu

**Files:**
- Create: `backend/Konkursownik.Api/Domain/ContestPrize.cs`; migracja `ContestPrizes`
- Modify: `Domain/Contest.cs` (usuń `PrizeDescription`, `PrizeValue`, `PrizeCount`; dodaj `List<ContestPrize> Prizes`), `Data/AppDbContext.cs`, `Features/Contests/ContestDtos.cs`, `ContestMapping.cs`, `ContestValidation.cs`, `ContestEndpoints.cs` (duplikowanie), `Features/Stats/StatsEndpoints.cs` (jeśli używa pól nagrody), testowe `Samples`
- Modify (frontend, tylko typy i przekazywanie, bez nowego UI): `src/api/types.ts`, `src/lib/contestUpsert.ts`, `src/features/contests/contestForm.ts` (round-trip `prizes`), fixtures testów
- Test: `backend/Konkursownik.Tests/ContestPrizesTests.cs`

**Interfaces:**
- Produces:
  - `ContestPrize { Guid Id; Guid ContestId; string Name; decimal? Value; int? Count; int Order; }` (kaskada)
  - `record PrizeDto(Guid? Id, string Name, decimal? Value, int? Count)`
  - `ContestUpsertDto` i `ContestDto`: usunięte `PrizeDescription`, `PrizeValue`, `PrizeCount`; dodane `List<PrizeDto> Prizes` (po `Proofs`)
  - Zastępowanie listy w PUT jak dla innych dzieci; duplikowanie kopiuje nagrody z nowymi id
  - Walidacja: `Name` niepusta ≤ 200, `Value` null lub ≥ 0, `Count` null lub > 0 → 400 (klucz `Prizes`)
  - Migracja: `Up` — utwórz tabelę, potem `INSERT INTO "ContestPrizes" (…) SELECT gen_random_uuid(), "Id", COALESCE("PrizeDescription", 'Nagroda'), "PrizeValue", "PrizeCount", 0 FROM "Contests" WHERE "PrizeDescription" IS NOT NULL OR "PrizeValue" IS NOT NULL`, dopiero potem usuń kolumny; `Down` odwrotnie (pierwsza nagroda wg `Order` wraca do kolumn)
  - TS: `PrizeDto { id: string | null; name: string; value: number | null; count: number | null }`, `prizes` w `ContestUpsertDto`/`ContestDto`; obecny formularz przenosi `prizes` bez zmian i nie wysyła już starych pól (stare pola nagrody w formularzu usunąć; nowe UI w Task 5)

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Prizes_roundtrip_in_order()          // ["Samochód",120000,1], ["Rower",2500,10] → GET w tej kolejności
[Fact] public async Task Put_keeps_prize_ids_and_removes_missing()
[Fact] public async Task Invalid_prize_returns_400()           // name "", value -1, count 0 → 400, klucz "Prizes"
[Fact] public async Task Duplicate_copies_prizes_with_new_ids()
[Fact] public async Task Migration_moves_single_prize()        // stan sprzed migracji: konkurs z PrizeDescription "Bon", PrizeValue 50, PrizeCount 3 i konkurs bez nagrody;
                                                                // migrate → pierwszy ma 1 nagrodę (Bon, 50, 3), drugi 0
```
Test migracji: osobna baza w kontenerze, `MigrateAsync(targetMigration: "<poprzednia>")`, wstaw wiersz SQL-em, potem `MigrateAsync()`.
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: `dotnet test` i `npm test` PASS**
- [ ] **Step 5: Commit** — `feat: multiple prizes per contest`

---

### Task 2: Wygrana wskazuje nagrodę; karty i przypomnienia z najcenniejszą nagrodą

**Files:**
- Modify: `Domain/Win.cs` (`Guid? PrizeId`), `Data/AppDbContext.cs` (FK do `ContestPrize`, `OnDelete SetNull`), `Features/Contests/ContestDtos.cs` (`WinDto`, `ContestCardDto`), `ContestCards.cs`, `Features/Entries/EntryDtos.cs`/`EntryEndpoints.cs` (PUT win), `Features/Reminders/ReminderDtos.cs` (jeśli zależne); migracja `WinPrizeId`
- Modify (frontend, typy + bez zmian wyglądu poza tym, co wymusza usunięcie starych pól): `types.ts`, `ContestCard.tsx`, `DetailsHeaderCard.tsx`, `ReminderCards.tsx`, `filters.ts` (sort „Wartość” po `topPrize.value`)
- Test: `backend/Konkursownik.Tests/WinPrizeTests.cs`, `ContestCardsTests.cs` (rozszerzenie), `frontend/src/features/contests/filters.test.ts`

**Interfaces:**
- Produces:
  - `WinDto(..., Guid? PrizeId)` jako nowy ostatni parametr (domyślnie null); PUT win: `PrizeId` musi należeć do tego konkursu, inaczej 400 `{ "error": "invalid_prize" }`
  - Usunięcie nagrody (PUT konkursu bez niej) → `Win.PrizeId = null`, `PrizeWon`/`PrizeValue` bez zmian
  - `record TopPrizeDto(string Name, decimal? Value, int? Count)`; `ContestCardDto`: zamiast `PrizeDescription`, `PrizeValue` → `TopPrizeDto? TopPrize`, `int PrizesCount`
  - `TopPrize` = nagroda z najwyższym `Value`; przy remisie lub braku wartości — pierwsza wg `Order`
  - Frontend: karta i przypomnienia pokazują `topPrize.name` (+ wartość) oraz „+N innych”, gdy `prizesCount > 1` (`N = prizesCount - 1`); sortowanie „Wartość” po `topPrize?.value` (null na końcu)

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Put_win_with_prize_of_this_contest()
[Fact] public async Task Put_win_with_foreign_prize_400()
[Fact] public async Task Removing_won_prize_nulls_prize_id_keeps_text()
[Fact] public void Top_prize_is_highest_value_then_first()
```
```ts
it("sort prize uses topPrize value, nulls last", ...)
it("card shows top prize and +N innych", ...)
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: win points to prize; cards show top prize`

---

### Task 3: AI odczytuje listę nagród

**Files:**
- Modify: `Features/Ai/ContestExtraction.cs` (prompt, schemat, `Map`, DTO)
- Test: `backend/Konkursownik.Tests/AiContestTests.cs` (rozszerzenie)

**Interfaces:**
- Produces: `record ExtractedPrizeDto(string Name, decimal? Value, int? Count)`; `ContestExtractionDto`: zamiast `PrizeDescription`, `PrizeValue`, `PrizeCount` → `List<ExtractedPrizeDto> Prizes`. Map: pozycje bez nazwy pominięte; `Value` < 0 → null; `Count` ≤ 0 → null; wartości jako liczba lub string z przecinkiem. Prompt: „wypisz wszystkie nagrody (główne, II stopnia, natychmiastowe…) z wartością jednostkową w zł i liczbą sztuk”.

- [ ] **Step 1: Testy**

```csharp
[Fact] public void Map_prizes_list()     // [{"name":"Samochód","value":120000,"count":1},{"name":"Rower","value":"2 500,00","count":10}] → 2 nagrody, 2500
[Fact] public void Map_prizes_drops_nameless_and_fixes_bad_numbers()  // [{"value":5},{"name":"Bon","value":-1,"count":0}] → 1 nagroda Bon, Value null, Count null
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ai): extract prize list`

---

### Task 4: Konto administratora z konfiguracji, nicki, zaproszenia tylko dla administratora

**Files:**
- Create: `Features/Auth/AdminSeeder.cs`
- Modify: `Features/Auth/AuthEndpoints.cs`, `AuthDtos.cs`, `Program.cs` (role Identity, seeder po migracji, polityka `"Admin"`), `appsettings.json` / `appsettings.Development.json` (usuń `Invites:BootstrapCode`, dodaj pustą sekcję `Admin`), `docker-compose.yml`, `.env.example`, `docs/deploy.md`, `scripts/smoke.sh`, `backend/Konkursownik.Tests/Infrastructure/ApiFactory.cs`
- Uwaga: w drzewie roboczym są niezacommitowane zmiany Gemini (`.env.example`, `docker-compose.yml`, `docs/deploy.md`, `Konkursownik.Api.csproj` z `UserSecretsId`) — zachowaj je i dołącz do commita tego zadania
- Test: `backend/Konkursownik.Tests/AdminTests.cs`, `AuthTests.cs` (aktualizacja)

**Interfaces:**
- Produces:
  - `AdminSeeder.EnsureAdminAsync(IServiceProvider sp, IConfiguration cfg, ILogger log)`: rola `Admin` istnieje; gdy `Admin:UserName` puste → ostrzeżenie w logu i nic więcej; gdy konto (UserName, bez wielkości liter) nie istnieje → utworzenie z `Admin:Password` (hasło < 8 znaków lub odrzucone przez Identity → wyjątek z czytelnym komunikatem, start się nie udaje); konto → rola `Admin`; hasło istniejącego konta nie jest zmieniane
  - `record RegisterRequest(string UserName, string Password, string InviteCode)`; `record LoginRequest(string UserName, string Password)`; `record MeDto(string UserName, bool IsAdmin)`
  - Rejestracja: walidacja nicku (regex `^[A-Za-z0-9._-]{3,32}$`; zajęty bez wielkości liter → 400 `{ "error": "username_taken" }`; zły format → 400 `{ "error": "invalid_username" }`); kod zaproszenia zawsze wymagany; bootstrap usunięty
  - Logowanie: po `UserName` (znormalizowanym) — działa też dla starych kont z e-mailem jako `UserName`
  - `POST/GET /api/invites` z polityką `Admin` → 403 dla innych
  - `ApiFactory`: `Admin:UserName=admin`, `Admin:Password=AdminHaslo123!`; `CreateUserClientAsync` loguje się jako admin, generuje zaproszenie, rejestruje nowego użytkownika (nick `u{guid:N}`[..20])
  - `.env.example`: `ADMIN_USERNAME=`, `ADMIN_PASSWORD=` z komentarzem; usunięty `BOOTSTRAP_CODE`; compose przekazuje `Admin__UserName`, `Admin__Password`; `smoke.sh` ustawia losowe admina i loguje się nim zamiast rejestracji kodem; `docs/deploy.md`: pierwsze konto = administrator z `.env`/user-secrets (`dotnet user-secrets set "Admin:UserName" "piotrek"`, `… "Admin:Password" "…"`)

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Admin_is_created_and_can_invite()
[Fact] public async Task Existing_account_gets_admin_role_password_unchanged()
[Fact] public async Task Non_admin_invites_403()
[Fact] public async Task No_admin_config_starts_and_nobody_can_invite()      // osobna fabryka bez Admin:* → /api/health 200, register bez kodu 400
[Fact] public async Task Register_with_username_and_login()
[Fact] public async Task Username_rules()                                    // "ab", "ma spacje", "a@b" → invalid_username; "Piotrek" po "piotrek" → username_taken
[Fact] public async Task Legacy_email_username_can_log_in()                   // konto utworzone z UserName "stary@x.pl" → login 200
[Fact] public async Task Me_returns_username_and_is_admin()
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** (dopasuj wszystkie istniejące testy do nowego helpera) · **Step 4: `dotnet test` PASS, `bash scripts/smoke.sh` PASS**
- [ ] **Step 5: Commit** — `feat: config-based admin, usernames, admin-only invites`

---

### Task 5: Frontend — lista nagród w formularzu, wybór nagrody przy wygranej, nagrody w szczegółach, AI

**Files:**
- Modify: `src/pages/ContestFormPage.tsx`, `src/features/contests/contestForm.ts`, `src/features/ai/` (merge nagród z oznaczeniem AI), `src/features/details/DetailsHeaderCard.tsx` (lista wszystkich nagród), `src/features/details/WinSection.tsx` (wybór nagrody)
- Test: `ContestFormPage.test.tsx`, `WinSection.test.tsx`, `DetailsHeaderCard.test.tsx`, testy merge AI

**Interfaces:**
- Consumes: `PrizeDto`, `WinDto.prizeId`, `ExtractedPrizeDto` (Task 1–3)
- Produces:
  - Sekcja „Nagrody” w formularzu (`EditableList<PrizeDto>`, przycisk „Dodaj nagrodę”), pola „Nagroda”, „Wartość (zł)” (`parseAmount`), „Liczba sztuk”; walidacja jak backend
  - AI: nagrody dopisywane z `id:null` i oznaczeniem „AI — sprawdź” na sekcji
  - Szczegóły: lista nagród „{nazwa} — {wartość} ×{liczba}” (pomijając puste części)
  - Wygrana: select „Nagroda” z opcjami nagród konkursu + „Inna”; wybór ustawia `prizeId`, `prizeWon`, `prizeValue` (edytowalne dalej); „Inna” → `prizeId:null`

- [ ] **Step 1: Testy**

```ts
it("form round-trips prizes with ids and sends values as numbers", ...)   // „2 500,50” → 2500.5
it("prize validation messages", ...)
it("ai prizes appended with badge", ...)
it("win select fills name and value and sends prizeId; Inna clears prizeId", ...)
it("details list shows all prizes", ...)
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: `npm test`, build, lint PASS**
- [ ] **Step 5: Commit** — `feat(ui): prize list, win prize picker`

---

### Task 6: Frontend — nicki, zaproszenia tylko dla administratora, podpisy pól

**Files:**
- Modify: `src/components/AuthForm.tsx`, `src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `src/auth/AuthProvider.tsx`, `src/shell/ProfileMenu.tsx`, `src/App.tsx` (trasa `/zaproszenia` tylko dla admina → przekierowanie na `/`), `src/components/EditableList.tsx` lub poszczególne `renderItem` w `ContestFormPage.tsx` i `WinSection.tsx` (podpisy), `src/api/types.ts`
- Test: `RegisterPage.test.tsx`, `LoginPage.test.tsx` (nowy), `ProfileMenu.test.tsx`, `ContestFormPage.test.tsx`

**Interfaces:**
- Consumes: `MeDto { userName, isAdmin }`, błędy `invalid_username`, `username_taken` (Task 4)
- Produces:
  - Formularze: pole „Nazwa użytkownika” (`autocomplete="username"`) zamiast e-maila; komunikaty: `invalid_username` → „Nazwa: 3–32 znaki, litery, cyfry, kropka, podkreślnik lub myślnik”, `username_taken` → „Ta nazwa jest już zajęta”, `invalid_invite` jak dotąd
  - Menu profilu: nazwa użytkownika; „Zaproszenia” tylko gdy `isAdmin`
  - Podpisy (spec §6, każde pole ma `<label>` powiązany z polem, nagłówek pozycji „Produkt 2” itp.): Do zrobienia „Krok”; Do kupienia „Produkt”, „Sklep”, „Ilość lub kwota” (placeholder „np. 2 szt., min. 20 zł”), „Notatka”; Do zachowania „Co zachować” (placeholder „np. paragon, opakowanie”), „Trzymać do”, „Gdzie leży”, „Notatka”; Nagrody „Nagroda”, „Wartość (zł)”, „Liczba sztuk”; Kroki laureata „Krok”

- [ ] **Step 1: Testy**

```ts
it("register sends userName and maps username errors", ...)
it("login with username", ...)
it("profile menu hides Zaproszenia for non-admin", ...)
it("/zaproszenia redirects non-admin", ...)
it("every list field has a label", ...)   // getByLabelText("Produkt"), ("Sklep"), ("Ilość lub kwota"), ("Co zachować"), ("Trzymać do"), ("Gdzie leży"), ("Nagroda"), ("Wartość (zł)"), ("Liczba sztuk")
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: `npm test`, build, lint PASS**
- [ ] **Step 5: Commit** — `feat(ui): usernames, admin-only invites, labelled list fields`
