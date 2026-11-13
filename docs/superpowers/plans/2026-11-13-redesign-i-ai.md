# Konkursownik — nowy wygląd, rozszerzone dane i odczyt przez AI — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozszerzyć dane (ikona, szybki status, sklep, podpisy zdjęć, notatki, kroki laureata, bogate karty, schowek dowodów), dodać odczyt paragonu i konkursu przez Gemini oraz przebudować cały frontend według makiet.

**Architecture:** Trzy etapy na jednej gałęzi `feat/redesign`: (1) backend + typy frontendu, obecny UI działa dalej; (2) usługi AI w backendzie za interfejsem, testowane na atrapie; (3) nowy frontend na tokenach motywu Tailwind 4 i wspólnych komponentach, z wpiętym UI odczytu AI. Każde zadanie kończy się zielonym `dotnet test` i `npm test`.

**Tech Stack:** jak w MVP (.NET 10, EF Core 10 + Npgsql, xUnit, Testcontainers; React 19, TS, Vite, React Router 8, TanStack Query 5, Tailwind 4, Vitest) + ASP.NET Core Rate Limiting, Gemini REST API (`generateContent`, structured output), `@fontsource*` (Geist, JetBrains Mono), `@material-symbols/svg-400`.

**Spec:** `docs/superpowers/specs/2026-11-13-redesign-i-ai-design.md` (wcześniejsza: `docs/superpowers/specs/2026-11-12-konkursownik-design.md`). Makiety: `docs/design/mockups/{konkursy,pilne,zakupy,szczegoly}.html`.

## Global Constraints

- Wszystkie zasady MVP: „dziś” = `TimeProvider.TodayInPoland()`; cudzy zasób po id → **404**; zdjęcia nigdy publiczne; JSON camelCase, enumy jako stringi (`JsonConfig.Options`); jedna domena.
- Nowe pola nullable; migracje EF bez utraty danych; nazwy migracji podane w zadaniach.
- Walidacja → 400 ValidationProblem (wzorzec `*Validation.Validate` → `Dictionary<string,string[]>`).
- AI tylko wypełnia formularz; **nic nie zapisuje**. Klucz Gemini wyłącznie na serwerze. Testy nigdy nie wołają prawdziwego Gemini.
- Wartość od AI spoza zamkniętych list / zły format daty → `null` (bez błędu).
- UI po polsku; **żadnych zmyślonych treści** (zakazane m.in.: „Zweryfikowany”, „Potwierdzony”, „Czytelne”, „EAN-13…”, „szyfrowane”, „100% lokalnych”, „§…”, „pula …”, „loteria audytowana”, „lista rezerwowa”, „okres reklamacji”); stopka prywatności: „Twoje dane widzisz tylko Ty”; przy zdjęciach: „Widoczne tylko dla Ciebie”.
- Ciemny motyw domyślny (wartości z makiet), jasny dostępny; wybór w `localStorage` pod kluczem `konkursownik-theme` (`dark`|`light`), klasa `dark` na `<html>` ustawiana przed renderem.
- Czcionki: Geist (tekst), JetBrains Mono (liczby, daty, kody). Ikony: Material Symbols Outlined jako SVG, tylko użyte.
- Cele dotyku ≥ 44 px; animacje wyłączone przy `prefers-reduced-motion`; kontrast AA w obu motywach.
- Ekran startowy po zalogowaniu: **Pilne** (`/`). Dolna nawigacja: Konkursy `/konkursy` · Pilne `/` · „+” · Zakupy `/zakupy` · Statystyki `/statystyki`.
- Mobile-first; od 768 px kolumna wyśrodkowana (max 640 px dla szczegółów i formularzy); od 1024 px karty Konkursów w 2 kolumnach; kontener `max-w-7xl`.

## Review Focus

1. **Stary formularz wymazuje nowe pola** — zapis konkursu/wygranej z formularza, który nie zna ikony, notatek czy kroków laureata, nie może ich zerować. Testy: Task 1 (`edit_preserves_icon_and_notes`), Task 3 (`Put_win_without_steps_field_keeps_existing_steps`, `win_form_preserves_steps`).
2. **Śmieci od AI** — częściowy JSON, puste pola, nieznana ikona/typ, data „14 listopada” → pola `null`, odpowiedź 200, nigdy 500. Testy: Task 7, Task 8.
3. **Gemini niedostępny / timeout / limit** — 503/422/429 z czytelnym komunikatem, formularz zostaje wypełniony tym, co wpisał użytkownik. Testy: Task 7 (backend), Task 15 (frontend).
4. **Mignięcie jasnego motywu** — przy zapisanym `dark` pierwsza klatka nie może być jasna i odwrotnie. Test: Task 9.
5. **Odhaczony zakup w trybie sklepowym** — odznaczenie przywraca pozycję, nieudany zapis przywraca stan sprzed kliknięcia. Test: Task 13.

---

## Struktura plików (nowe i zmieniane)

```
backend/Konkursownik.Api/
  Domain/ Contest.cs (Icon) ContestChildren.cs (Note×2) Entry.cs (Store, Photo.Label) Win.cs (Steps) WinStep.cs ContestIcons.cs PhotoLabel.cs
  Features/Contests/ ContestDtos.cs ContestMapping.cs ContestValidation.cs ContestEndpoints.cs (status, duplikat)
                     ContestCards.cs            # wspólny builder bogatej karty (Task 4)
  Features/Entries/  EntryDtos.cs EntryEndpoints.cs (win steps) ItemToggleEndpoints.cs (win-steps)
  Features/Photos/   PhotoEndpoints.cs (label)
  Features/Reminders/ReminderRules.cs ReminderEndpoints.cs (ReminderDto)
  Features/ShoppingList/ ShoppingListBuilder.cs
  Features/Proofs/   ProofEndpoints.cs
  Features/Ai/       GeminiOptions.cs IGeminiClient.cs GeminiClient.cs AiEndpoints.cs ReceiptExtraction.cs ContestExtraction.cs
                     PageFetcher.cs IpPolicy.cs AiFeatures.cs
frontend/src/
  ui/        tokens.css theme.ts Icon.tsx icons.ts Card.tsx StatusBadge.tsx FilterPill.tsx Section.tsx CheckButton.tsx BottomSheet.tsx Button.tsx Field.tsx
  shell/     AppHeader.tsx ProfileMenu.tsx BottomNav.tsx AddSheet.tsx NewEntryPicker.tsx Layout.tsx DetailLayout.tsx
  pages/     RemindersPage ContestsPage ShoppingPage ContestDetailsPage ContestFormPage StatsPage InvitesPage ProofsPage LoginPage RegisterPage
  features/  contests/ (ContestCard, IconPicker, storeIcons.ts) reminders/ (Timeline, ReminderCard*) details/ (tabs, EntryFormV2, StatusMenu) ai/ (AiFillSection, useAiExtract, AiNotice)
```
Stare komponenty, których nowe ekrany nie używają, usuwa zadanie, które je zastępuje.

---

## Etap 1 — dane

### Task 1: Ikona konkursu, szybki status, notatki pozycji i dowodów

**Files:**
- Create: `Domain/ContestIcons.cs`
- Modify: `Domain/Contest.cs`, `Domain/ContestChildren.cs`, `Data/AppDbContext.cs`, `Features/Contests/ContestDtos.cs`, `ContestMapping.cs`, `ContestValidation.cs`, `ContestEndpoints.cs`; migracja `ExtendContests`
- Modify (frontend): `src/api/types.ts`, `src/api/hooks.ts`, `src/pages/ContestFormPage.tsx` (przenoszenie nowych pól bez zmian UI)
- Test: `backend/Konkursownik.Tests/ContestExtensionsTests.cs`, `frontend/src/pages/ContestFormPage.test.tsx`

**Interfaces:**
- Produces:
  - `static class ContestIcons { const string Default = "emoji_events"; static readonly IReadOnlySet<string> All; }` — dokładnie: `emoji_events, cookie, coffee, local_drink, icecream, local_pizza, liquor, bakery_dining, storefront, shopping_basket, spa, cleaning_services, pets, child_care, checkroom, devices, sports_esports, directions_car, flight, redeem`
  - `Contest.Icon: string?`; `PurchaseItem.Note: string?` (≤300); `ProofItem.Note: string?` (≤300)
  - `PurchaseDto(..., string? Note)`, `ProofDto(..., string? Note)` (nowy ostatni parametr), `ContestUpsertDto(..., string? Icon)` i `ContestDto(..., string? Icon)` (nowy parametr po `Notes`)
  - `record StatusDto(ContestStatus Status)`; `PATCH /api/contests/{id}/status` → 204 | 400 | 404
  - Duplikowanie kopiuje `Icon` i notatki
  - TS: `Icon` w typach, `note` w `PurchaseDto`/`ProofDto`; `CONTEST_ICONS` w `src/lib/contestIcons.ts` (ta sama lista); hook `useSetStatus()`

- [ ] **Step 1: Testy backendu**

```csharp
[Fact] public async Task Icon_and_notes_roundtrip()          // icon "coffee", purchase.note "Weź paragon papierowy", proof.note "Nie wyrzucać folii" → GET zwraca te same
[Fact] public async Task Unknown_icon_returns_400()           // icon "rocket" → 400, klucz "Icon"
[Fact] public async Task Note_over_300_returns_400()
[Fact] public async Task Patch_status_changes_only_status()   // Planned → Bought; nazwa, zakupy bez zmian
[Fact] public async Task Patch_status_other_user_404()
[Fact] public async Task Duplicate_copies_icon_and_notes()
```
- [ ] **Step 2: Test frontu** — `edit_preserves_icon_and_notes`: formularz edycji załadowany z `icon:"coffee"` i notatkami, zmiana tylko nazwy → body PUT zawiera `icon:"coffee"` i obie notatki.
- [ ] **Step 3: Uruchom — FAIL** (`dotnet test --filter ContestExtensionsTests`, `npm test -- ContestFormPage`)
- [ ] **Step 4: Implementacja** (walidacja ikony: `null` lub `ContestIcons.All.Contains`; migracja `dotnet tool run dotnet-ef migrations add ExtendContests`)
- [ ] **Step 5: `dotnet test` i `npm test` — PASS**
- [ ] **Step 6: Commit** — `feat: contest icon, quick status, item notes`

---

### Task 2: Sklep przy zgłoszeniu i podpisy zdjęć

**Files:**
- Create: `Domain/PhotoLabel.cs`
- Modify: `Domain/Entry.cs`, `Data/AppDbContext.cs`, `Features/Entries/EntryDtos.cs`, `EntryEndpoints.cs`, `Features/Contests/ContestDtos.cs` (EntryDto), `ContestMapping.cs`, `Features/Photos/PhotoEndpoints.cs`; migracja `EntryStorePhotoLabel`
- Modify (frontend): `types.ts`, `hooks.ts`, `components/EntryCard.tsx`, `EntryForm.tsx`, `PhotoPicker.tsx` (+ testy)
- Test: `backend/Konkursownik.Tests/EntryStorePhotoLabelTests.cs`

**Interfaces:**
- Produces:
  - `enum PhotoLabel { Receipt, Packaging, Code, Other }`; `Photo.Label` (domyślnie `Receipt`); `Entry.Store: string?` (≤100)
  - `EntryUpsertDto(..., string? Store)`; `record PhotoDto(Guid Id, PhotoLabel Label, long SizeBytes)`; `EntryDto(..., List<PhotoDto> Photos)` **zamiast** `PhotoIds`
  - Upload: opcjonalne pole formularza `label` (nieznane → 400 `{error:"invalid_label"}`); `record PhotoLabelDto(PhotoLabel Label)`; `PATCH /api/photos/{id}` → 204 | 400 | 404
  - TS: `PhotoDto`, `photoLabel` (PL: Paragon, Opakowanie, Kod, Inne) w `src/lib/labels.ts`; `useUploadPhoto` przyjmuje `label?`; obecny UI pokazuje miniatury z `photos[].id`

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Entry_store_roundtrip()
[Fact] public async Task Upload_with_label_packaging_is_listed_with_label()
[Fact] public async Task Upload_without_label_defaults_to_receipt()
[Fact] public async Task Patch_photo_label_other_user_404()
[Fact] public async Task Upload_invalid_label_400()
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja + dopasowanie frontu (testy PhotoPicker/EntryCard zaktualizowane)** · **Step 4: oba zestawy testów PASS**
- [ ] **Step 5: Commit** — `feat: entry store and photo labels`

---

### Task 3: Kroki laureata

**Files:**
- Create: `Domain/WinStep.cs`
- Modify: `Domain/Win.cs`, `Data/AppDbContext.cs`, `Features/Entries/EntryDtos.cs` (walidacja), `EntryEndpoints.cs` (PUT win), `ItemToggleEndpoints.cs`, `Features/Contests/ContestDtos.cs` (WinDto), `ContestMapping.cs`; migracja `WinSteps`
- Modify (frontend): `types.ts`, `hooks.ts`, `components/WinForm.tsx` (przenosi kroki bez zmian UI)
- Test: `backend/Konkursownik.Tests/WinStepsTests.cs`, `frontend/src/components/WinForm.test.tsx`

**Interfaces:**
- Produces:
  - `WinStep { Guid Id; Guid WinId; string Text; bool Done; int Order; }` (kaskada z Win)
  - `record WinStepDto(Guid? Id, string Text, bool Done)`; `WinDto(..., List<WinStepDto> Steps)` (domyślnie pusta lista przy braku w body); tekst kroku niepusty ≤300
  - PUT win zastępuje kroki jak dzieci konkursu (istniejące id aktualizowane, brakujące usuwane, obce/nieznane → nowe id)
  - `PATCH /api/win-steps/{id}` `ToggleDto` → 204 | 404 (własność Win → Contest)
  - Duplikowanie nie kopiuje wygranej ani kroków

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Put_win_with_steps_roundtrip_in_order()   // ["Oświadczenie laureata", "Skan paragonu"]
[Fact] public async Task Put_win_keeps_step_ids_and_removes_missing()
[Fact] public async Task Toggle_win_step()
[Fact] public async Task Toggle_win_step_other_user_404()
[Fact] public async Task Put_win_without_steps_field_keeps_existing_steps()  // body bez "steps" → kroki zostają
```
Front: `win_form_preserves_steps` — edycja kwoty nagrody wysyła istniejące kroki.
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** (rozróżnij „brak pola `steps`” = nie ruszaj od „pusta lista” = usuń: `List<WinStepDto>? Steps`) · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: laureate steps`

---

### Task 4: Bogate karty — lista konkursów i przypomnienia

**Files:**
- Create: `Features/Contests/ContestCards.cs`
- Modify: `Features/Contests/ContestDtos.cs`, `ContestEndpoints.cs` (lista), `Features/Reminders/ReminderRules.cs`, `ReminderEndpoints.cs`
- Modify (frontend): `types.ts`, strony używające `ContestSummaryDto`/`Reminder` (bez zmian wyglądu)
- Test: `backend/Konkursownik.Tests/ContestCardsTests.cs`, `ReminderDtoTests.cs`

**Interfaces:**
- Consumes: `ContestRules`, `ReminderRules.For` (bez zmian reguł)
- Produces:
  - `record OpenPurchaseDto(string Product, string? Quantity, string? Store, string? Note)`
  - `record CardWinDto(string PrizeWon, decimal? PrizeValue, DateOnly? LaureateDeadline, bool LaureateDataSent, int StepsDone, int StepsTotal)`
  - `record ContestCardDto(Guid Id, string Name, string? Organizer, string? Icon, ContestType Type, string? PrizeDescription, decimal? PrizeValue, DateOnly StartDate, DateOnly EndDate, DateOnly? ResultsDate, ContestStatus Status, ContestStatus EffectiveStatus, int EntryCount, int EntriesToday, int? EntryLimitTotal, int? EntryLimitPerDay, string? Url, string? RulesUrl, int PurchasesTotal, int PurchasesBought, OpenPurchaseDto? FirstOpenPurchase, List<string> Stores, string? FirstProofLocation, CardWinDto? Win, DateTimeOffset CreatedAt)`
  - `static ContestCardDto ContestCards.Build(Contest c, DateOnly today)`
  - `GET /api/contests?view=` zwraca `ContestCardDto[]` (zastępuje `ContestSummaryDto`, które znika)
  - `record ReminderDto(ReminderKind Kind, DateOnly DueDate, Guid? ItemId, string? ItemText, ContestCardDto Contest, List<string> ConfirmationCodes, List<WinStepDto> WinSteps, string? ProofLocation, string? ProofNote, List<OpenPurchaseDto> BoughtPurchases)` — pola specyficzne wypełniane tylko dla swojego rodzaju (inaczej puste listy/null): ResultsDue → kody (bez null, kolejność zgłoszeń), LaureateDeadline → kroki, ProofDisposable → location/note, EndingSoon/Ended → kupione pozycje
  - `GET /api/reminders` → `ReminderDto[]` (kolejność jak `ReminderRules.For`)
  - Wszystko jednym zapytaniem z `Include`/`AsSplitQuery` (bez N+1)

- [ ] **Step 1: Testy**

```csharp
[Fact] public void Build_counts_purchases_and_first_open()           // 3 zakupy, 1 kupiony → Total 3, Bought 1, FirstOpen = pierwszy niekupiony wg Order
[Fact] public void Build_stores_distinct_trimmed()                   // " Biedronka ", "Biedronka", null → ["Biedronka"]
[Fact] public void Build_first_proof_location_skips_discarded()
[Fact] public void Build_win_steps_progress()
[Fact] public async Task List_returns_cards_only_own()
[Fact] public async Task Reminders_results_due_has_confirmation_codes()
[Fact] public async Task Reminders_laureate_has_steps_and_proof_has_location()
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja + frontend typy (obecne strony korzystają z `ContestCardDto`/`ReminderDto`)** · **Step 4: oba zestawy PASS**
- [ ] **Step 5: Commit** — `feat: rich contest cards and reminder context`

---

### Task 5: Lista zakupów z kontekstem i schowek dowodów

**Files:**
- Create: `Features/Proofs/ProofEndpoints.cs`
- Modify: `Features/ShoppingList/ShoppingListBuilder.cs`, `Program.cs`, `Konkursownik.Api.http`
- Modify (frontend): `types.ts`, `hooks.ts` (`useProofs`)
- Test: `ShoppingListBuilderTests.cs` (rozszerzenie), `ProofEndpointTests.cs`

**Interfaces:**
- Produces:
  - `ShoppingItemDto(Guid Id, Guid ContestId, string ContestName, string Product, string? Quantity, DateOnly ContestEndDate, string? ContestIcon, string? Note)`
  - `record ProofListItemDto(Guid Id, Guid ContestId, string ContestName, string? ContestIcon, string What, DateOnly? KeepUntil, string? Location, string? Note)`
  - `GET /api/proofs` → niewyrzucone dowody wszystkich konkursów użytkownika (także archiwum), sort `KeepUntil` rosnąco, null na końcu, potem nazwa konkursu

- [ ] **Step 1: Testy**

```csharp
[Fact] public void Shopping_item_has_end_date_icon_and_note()
[Fact] public async Task Proofs_lists_non_discarded_from_archived_too()
[Fact] public async Task Proofs_sorted_keep_until_nulls_last()
[Fact] public async Task Proofs_only_own()
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: shopping context and proofs list`

---

## Etap 2 — odczyt przez AI (backend)

### Task 6: Klient Gemini, konfiguracja, flaga funkcji i limit

**Files:**
- Create: `Features/Ai/GeminiOptions.cs`, `IGeminiClient.cs`, `GeminiClient.cs`, `AiFeatures.cs`
- Modify: `Program.cs`, `appsettings.json`, `docs/deploy.md` (sekcja „Odczyt AI (Gemini)”)
- Test: `backend/Konkursownik.Tests/AiFeaturesTests.cs`, `GeminiClientTests.cs`

**Interfaces:**
- Produces:
  - `class GeminiOptions { string? ApiKey; string Model = ""; int TimeoutSeconds = 30; int RequestsPerHour = 30; bool Enabled => !string.IsNullOrWhiteSpace(ApiKey) && Model != ""; }` sekcja `Gemini`
  - `record GeminiPart(string? Text, byte[]? Data, string? MimeType)`
  - `interface IGeminiClient { Task<JsonElement?> GenerateJsonAsync(string prompt, IReadOnlyList<GeminiPart> parts, JsonObject responseSchema, CancellationToken ct); }` — `null` przy nieparsowalnej odpowiedzi; rzuca `GeminiUnavailableException` przy błędzie sieci/timeout/5xx
  - `GeminiClient` — `HttpClient` + REST `POST {base}/v1beta/models/{Model}:generateContent?key=…` z `generationConfig.responseMimeType="application/json"` i schematem (format pól sprawdzić w aktualnej dokumentacji Gemini; klucz w nagłówku `x-goog-api-key`, nie w URL, jeśli API to wspiera)
  - `GET /api/features` (zalogowany) → `{ "aiExtraction": bool }`
  - Polityka limitu `"ai"`: ASP.NET RateLimiter, okno stałe 1 h, partycja = `UserId()`, limit `RequestsPerHour`; odrzucenie → 429 `{ "error": "rate_limited" }`
  - Endpointy AI (Task 7–8) przy `!Enabled` → 503 `{ "error": "ai_unavailable" }`; filtr `RequireAiEnabled()` w `AiFeatures.cs`
  - **Globalny strażnik limitów Gemini** (singleton `GeminiQuota`, wspólny dla wszystkich użytkowników, wołany przez `GeminiClient` przed i po wywołaniu): `GeminiOptions.MaxRequestsPerMinute = 15`, `MaxTokensPerMinute = 250_000`, `QuotaResetTimeZone = "America/Los_Angeles"`; okno przesuwne 60 s; `bool TryAcquire(int estimatedTokens)` (szacunek: tekst `znaki/4`, obraz 1 300, PDF `rozmiar_KB/4` — z zapasem), `void Record(int actualTokens)` z `usageMetadata.totalTokenCount`; brak miejsca → `GeminiBusyException` → endpoint 429 `{ "error": "ai_busy" }`; odpowiedź 429 od Gemini → `GeminiQuota.BlockUntilNextReset()` (do północy w `QuotaResetTimeZone`), w tym czasie `Enabled`-owe endpointy zwracają 503 `ai_unavailable`, a `/api/features` → `aiExtraction:false`
  - Domyślny `Model` w `appsettings.json`: model Flash 3.5 (dokładny identyfikator z aktualnej dokumentacji Gemini)
  - `ApiFactory` rejestruje atrapę `FakeGeminiClient` (kolejka odpowiedzi/wyjątków) i ustawia `Gemini:ApiKey=test`, `Gemini:Model=test`

- [ ] **Step 1: Testy**

```csharp
[Fact] public async Task Features_reports_ai_enabled_with_key()
[Fact] public async Task Features_reports_disabled_without_key()        // osobna fabryka bez klucza
[Fact] public async Task GeminiClient_parses_json_candidate()           // HttpMessageHandler-atrapa zwraca odpowiedź generateContent → JsonElement z polem "store"
[Fact] public async Task GeminiClient_unparsable_text_returns_null()
[Fact] public async Task GeminiClient_500_throws_unavailable()
[Fact] public void Quota_allows_15_per_minute_then_rejects()      // FakeTimeProvider: 15× TryAcquire(100) true, 16. false; po 61 s znowu true
[Fact] public void Quota_rejects_when_token_budget_exceeded()     // TryAcquire(240_000) true, potem TryAcquire(20_000) false
[Fact] public void Quota_record_uses_actual_tokens()
[Fact] public async Task Upstream_429_blocks_until_pacific_midnight() // po 429 od atrapy HTTP: /api/features false; po przesunięciu zegara za północ PT → true
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** (docs/deploy.md: zmienne `Gemini__ApiKey`, `Gemini__Model`; akapit „przed włączeniem sprawdź aktualne warunki Gemini API dot. wykorzystania danych — plan darmowy vs płatny, EOG”) · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: gemini client, feature flag, rate limit`

---

### Task 7: Odczyt paragonu

**Files:**
- Create: `Features/Ai/ReceiptExtraction.cs`, `Features/Ai/AiEndpoints.cs`
- Test: `backend/Konkursownik.Tests/AiReceiptTests.cs`

**Interfaces:**
- Consumes: `IGeminiClient`, `ImageSignature.Detect`, limit `10 * 1024 * 1024`, polityka `"ai"`, `RequireAiEnabled()`
- Produces:
  - `record ReceiptProductDto(string Name, decimal? Price)`; `record ReceiptExtractionDto(string? Store, DateOnly? Date, decimal? Amount, string? ReceiptNumber, List<ReceiptProductDto> Products)`
  - `static ReceiptExtractionDto ReceiptExtraction.Map(JsonElement json)` — tolerancyjne mapowanie: brak/zły typ → null; data tylko `YYYY-MM-DD`; kwota liczba lub string z przecinkiem/kropką; produkty bez nazwy pomijane
  - `ReceiptExtraction.Prompt` (PL) i `ReceiptExtraction.Schema` (JsonObject)
  - `POST /api/ai/receipt` multipart `file` → 200 `ReceiptExtractionDto` | 400 `too_large`/`unsupported_type` | 422 `extraction_failed` (null z klienta) | 503 `ai_unavailable` (wyłączone lub `GeminiUnavailableException`) | 429

- [ ] **Step 1: Testy**

```csharp
[Fact] public void Map_full_receipt()                       // {"store":"Biedronka","date":"2026-11-11","amount":24.9,"receiptNumber":"00482/0219","products":[{"name":"Ptasie Mleczko","price":12.45}]}
[Fact] public void Map_garbage_fields_become_null()         // date "11 listopada", amount "dużo", products [{"price":3}] → Date null, Amount null, Products []
[Fact] public void Map_amount_string_with_comma()           // "24,90" → 24.90
[Fact] public async Task Endpoint_returns_extraction()      // FakeGemini zwraca JSON
[Fact] public async Task Endpoint_unparsable_422()
[Fact] public async Task Endpoint_gemini_down_503()
[Fact] public async Task Endpoint_rejects_non_image_400()
[Fact] public async Task Endpoint_rate_limited_429()        // limit=2 w tej fabryce, trzecie wywołanie → 429
[Fact] public async Task Endpoint_saves_nothing()           // po wywołaniu brak nowych zgłoszeń/zdjęć
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: AI receipt extraction`

---

### Task 8: Odczyt konkursu (link, PDF, zrzut)

**Files:**
- Create: `Features/Ai/ContestExtraction.cs`, `PageFetcher.cs`, `IpPolicy.cs`
- Modify: `Features/Ai/AiEndpoints.cs`, `Program.cs`
- Test: `backend/Konkursownik.Tests/IpPolicyTests.cs`, `PageFetcherTests.cs`, `AiContestTests.cs`

**Interfaces:**
- Produces:
  - `static bool IpPolicy.IsPublic(IPAddress ip)` — false dla: loopback, prywatnych (10/8, 172.16/12, 192.168/16), link-local (169.254/16, fe80::/10), CGNAT 100.64/10, 0.0.0.0/8, unique-local fc00::/7, multicast, IPv4-mapped IPv6 tych zakresów
  - `interface IPageFetcher { Task<PageText?> FetchAsync(Uri url, CancellationToken ct); }`; `record PageText(string Title, string Text, List<string> Links)`; implementacja: tylko http/https; `SocketsHttpHandler.ConnectCallback` rozwiązuje DNS i łączy wyłącznie z adresem spełniającym `IsPublic` (odporne na DNS rebinding); `AllowAutoRedirect=false`, ręcznie maks. 3 przekierowania (każde przez ten sam handler); limit 2 MB, 10 s; HTML → tekst (usuń `script`/`style`/tagi, zdekoduj encje, zwiń białe znaki, przytnij do 200 000 znaków); `Links` = href zawierające „regulamin” lub kończące się `.pdf` (absolutne); `null` przy błędzie lub tekście < 200 znaków
  - `record ExtractedPurchaseDto(string Product, string? Store, string? Quantity, string? Note)`; `record ExtractedProofDto(string What, DateOnly? KeepUntil, string? Note)`
  - `record ContestExtractionDto(string? Name, string? Organizer, string? Url, string? RulesUrl, ContestType? Type, string? Icon, string? PrizeDescription, decimal? PrizeValue, int? PrizeCount, DateOnly? StartDate, DateOnly? EndDate, DateOnly? ResultsDate, string? ResultsCheckNote, int? EntryLimitPerDay, int? EntryLimitTotal, List<string> Tasks, List<ExtractedPurchaseDto> Purchases, List<ExtractedProofDto> Proofs, string? Notes)`
  - `static ContestExtractionDto ContestExtraction.Map(JsonElement json)` — `Type`/`Icon` spoza list → null; ujemne/zerowe limity → null; daty tylko `YYYY-MM-DD`
  - `POST /api/ai/contest`: JSON `{ "url": … }` → fetch → Gemini z tekstem strony (+ lista linków, `Url` w odpowiedzi = podany link jeśli AI nie zwróciło) | multipart `file`: PDF (`%PDF`, ≤ 15 MB) lub obraz (jak paragon) → Gemini z plikiem. Odpowiedzi: 200 | 400 (`invalid_url`, `too_large`, `unsupported_type`) | 422 `page_unreadable` (fetch null) / `extraction_failed` | 503 | 429
  - W testach `IPageFetcher` podmieniany atrapą; testy `PageFetcher` na lokalnym `HttpListener`/TestServer z wymuszonym `IsPublic`-wstrzyknięciem (konstruktor przyjmuje `Func<IPAddress,bool>`, domyślnie `IpPolicy.IsPublic`)

- [ ] **Step 1: Testy**

```csharp
[Theory] // IpPolicyTests: 127.0.0.1, 10.1.2.3, 172.20.0.1, 192.168.1.1, 169.254.169.254, 100.64.0.1, ::1, fe80::1, fd00::1, ::ffff:127.0.0.1 → false; 8.8.8.8, 2606:4700::1111 → true
[Fact] public async Task Fetcher_blocks_private_address()        // domyślna polityka, http://127.0.0.1:{port} → null
[Fact] public async Task Fetcher_blocks_redirect_to_private()    // polityka przepuszcza tylko pierwszy host; 302 na drugi → null
[Fact] public async Task Fetcher_rejects_over_2mb()
[Fact] public async Task Fetcher_strips_html_and_finds_regulamin_link()
[Fact] public void Map_unknown_icon_and_type_become_null()
[Fact] public void Map_dates_and_lists()
[Fact] public async Task Url_unreadable_returns_422_page_unreadable()
[Fact] public async Task Pdf_upload_extracts()
[Fact] public async Task Non_http_url_400()                     // "file:///etc/passwd", "ftp://x"
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat: AI contest extraction from link or file`

---

## Etap 3 — nowy wygląd

Każde zadanie frontendu: porównaj wynik z odpowiednią makietą w `docs/design/mockups/` (układ, odstępy, kolory, typografia), ale **treści wyłącznie z danych**. Testy w stylu istniejących (Testing Library, `fetch` przez `vi.stubGlobal`). Po każdym zadaniu `npm test`, `npm run build`, `npm run lint`.

### Task 9: System wizualny — tokeny, motywy, czcionki, ikony, komponenty bazowe

**Files:**
- Create: `src/ui/tokens.css`, `theme.ts`, `Icon.tsx`, `icons.ts`, `Card.tsx`, `StatusBadge.tsx`, `FilterPill.tsx`, `Section.tsx`, `CheckButton.tsx`, `BottomSheet.tsx`, `Button.tsx`, `Field.tsx` (+ testy)
- Modify: `src/index.css`, `index.html` (skrypt motywu w `<head>`), `package.json`

**Interfaces:**
- Produces:
  - `tokens.css`: `@theme` z kolorami makiet jako `--color-*` (nazwy jak w makietach: `surface`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`, `surface-container-lowest`, `surface-bright`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `primary`, `on-primary`, `primary-container`, `on-primary-container`, `secondary`, `on-secondary`, `secondary-container`, `tertiary`, `on-tertiary`, `tertiary-container`, `error`, `on-error`, `error-container`, `inverse-primary`, `primary-fixed`, `secondary-fixed`, `tertiary-fixed`, `surface-tint`), wartości ciemne z makiety domyślnie, jasne nadpisane pod `:root:not(.dark)`; fonty `--font-sans: Geist…`, `--font-mono: "JetBrains Mono"…`; skala tekstu z makiet (`text-label-xs` 10/12/600, `text-label-md` 12/16/500, `text-body-md` 13/18, `text-body-lg` 15/22, `text-title-md` 16/22/500, `text-headline-sm` 18/24/600, `text-headline-lg` 24/32/600); promienie `lg` 0.5rem, `xl` 0.75rem
  - `theme.ts`: `type Theme = "dark" | "light"`; `readTheme(storage: Storage | null): Theme` (domyślnie `"dark"`, błąd storage → `"dark"`); `applyTheme(t: Theme, root = document.documentElement)`; `useTheme(): { theme, toggle }`; ten sam algorytm w małym skrypcie inline w `index.html` przed bundlem
  - `<Icon name: IconName; size?: number; fill?: boolean; className?: string />` — `icons.ts` mapuje nazwy na surowe SVG (`import x from "@material-symbols/svg-400/outlined/<name>.svg?raw"`, wariant fill `<name>-fill.svg`), `IconName` = klucze mapy; SVG z `fill="currentColor"`, `aria-hidden`
  - Komponenty: `Card({tone?: "low"|"default"|"high"})`, `StatusBadge({status: ContestStatus})` (kolory jak makieta: Planowany neutralny, Kupione secondary, Zgłoszony/Czekam primary, Wygrana secondary pełny, Przegrana/Archiwum outline), `FilterPill({active, count?, icon?})`, `Section({icon, title, subtitle?})`, `CheckButton({checked, onChange, label})` 44×44 z `aria-pressed`, `BottomSheet({open, onClose, title})` (focus trap, Esc, kliknięcie tła), `Button({variant: "primary"|"secondary"|"ghost"|"success", icon?})`, `IconButton({icon, label})`, `Field({label, error?, children})`
  - `@media (prefers-reduced-motion: reduce)` wyłącza `animate-ping|pulse|bounce`
  - Paczki: Geist i JetBrains Mono z `@fontsource` (warianty variable jeśli istnieją), `@material-symbols/svg-400`

- [ ] **Step 1: Testy**

```ts
it("readTheme defaults to dark", () => expect(readTheme(null)).toBe("dark"));
it("readTheme reads light", () => { /* storage z "light" → "light" */ });
it("readTheme survives throwing storage", () => { /* getItem rzuca → "dark" */ });
it("inline head script and readTheme agree", () => { /* wykonaj skrypt z index.html na jsdom z localStorage "light" → brak klasy dark; "dark"/brak → klasa dark */ });
it("CheckButton toggles and has 44px target", () => { /* aria-pressed zmienia się; klasa min-w-11 min-h-11 */ });
it("BottomSheet closes on Escape", () => {});
it("Icon renders svg with aria-hidden", () => {});
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS + build**
- [ ] **Step 5: Commit** — `feat(ui): design tokens, themes, fonts, icons, base components`

---

### Task 10: Powłoka — nagłówek, menu profilu, nawigacja, panel „+”, Statystyki, Zaproszenia, logowanie

**Files:**
- Create: `src/shell/AppHeader.tsx`, `ProfileMenu.tsx`, `BottomNav.tsx`, `AddSheet.tsx`, `NewEntryPicker.tsx`, `Layout.tsx`, `DetailLayout.tsx`, `src/pages/StatsPage.tsx`, `InvitesPage.tsx` (+ testy)
- Modify: `src/App.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `components/AuthForm.tsx`
- Delete: `src/components/Layout.tsx`, `src/components/BottomNav.tsx`, `src/pages/MorePage.tsx` (logikę zaproszeń/statystyk przenieść)

**Interfaces:**
- Consumes: `useReminders`, `useShoppingList`, `useStats`, invites hooks, `useAuth`, `useTheme`, komponenty z Task 9
- Produces:
  - Trasy: `/` Pilne, `/konkursy`, `/zakupy`, `/statystyki` (w `Layout` z dolną nawigacją); `/konkursy/nowy`, `/konkursy/:id`, `/konkursy/:id/edycja`, `/dowody`, `/zaproszenia` (w `DetailLayout`: „Wróć” + tytuł, bez dolnej nawigacji); `/wiecej` → przekierowanie na `/statystyki`
  - `AppHeader({ title?: string; back?: boolean })` — bez `back`: napis „Konkursownik” (+ „· {title}” od `sm`); przełącznik motywu (`aria-label="Zmień motyw"`); `ProfileMenu`: e-mail, „Zaproszenia” → `/zaproszenia`, „Wyloguj”
  - `BottomNav`: kolejność Konkursy, Pilne (plakietka = liczba przypomnień, ukryta przy 0), „+” (`aria-label="Dodaj konkurs lub zgłoszenie"`), Zakupy (plakietka = liczba niekupionych pozycji), Statystyki
  - `AddSheet`: „Nowy konkurs” → `/konkursy/nowy`; „Nowe zgłoszenie / paragon” → `NewEntryPicker`: konkursy z `view=active` z `endDate >= dziś`, sort `endDate`, przy każdym „dziś x/y” (lub „dziś x”), wybór → `/konkursy/{id}?zgloszenie=1`
  - `StatsPage`: kafelki Konkursy, Zgłoszenia, Wygrane, Wydane, Wartość wygranych, Bilans (= wartość wygranych − wydane, kolor secondary gdy ≥ 0, inaczej error)
  - `InvitesPage`: jak dotychczasowa sekcja zaproszeń (generuj, lista wolny/zużyty, kopiuj, „Skopiowano”)
  - Login/Register: wyśrodkowana karta, ten sam formularz i komunikaty co dziś

- [ ] **Step 1: Testy**

```ts
it("nav order and badges", () => { /* 3 przypomnienia, 2 zakupy → „Pilne” 3, „Zakupy” 2; kolejność linków */ });
it("pilne badge hidden at zero", () => {});
it("add sheet → new entry picker lists only open contests sorted by end date", () => {});
it("picker navigates with ?zgloszenie=1", () => {});
it("profile menu logout clears user and goes to /login", () => {});
it("stats balance negative uses error tone", () => {});
it("/wiecej redirects to /statystyki", () => {});
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): app shell, add sheet, stats and invites pages`

---

### Task 11: Ekran Konkursy

**Files:**
- Create: `src/features/contests/ContestCard.tsx`, `src/features/contests/filters.ts` (+ testy)
- Modify: `src/pages/ContestsPage.tsx` (+ test)

**Interfaces:**
- Consumes: `ContestCardDto`, `useContests(view)`, `useSetStatus`, `useSaveWin` (dane wysłane), `useDuplicateContest`, `useReminders`
- Produces:
  - `type ContestFilter = "all"|"Planned"|"Bought"|"Submitted"|"AwaitingResults"|"Won"|"archive"`
  - `filterContests(cards, filter, query): ContestCardDto[]` — po `effectiveStatus`; wyszukiwanie bez wielkości liter i polskich znaków po nazwie, organizatorze, `stores`
  - `type ContestSort = "deadline"|"prize"|"newest"`; `sortContests(cards, sort)` — termin: `endDate` rosnąco; wartość: `prizeValue` malejąco, null na końcu; najnowsze: `createdAt` malejąco. Przycisk sortowania przełącza cyklicznie, etykiety „Termin”, „Wartość”, „Najnowsze”
  - Pasek: kropka + „Panel” + data `formatDate(dziś)` + plakietka „{n} na dziś” (przypomnienia z `dueDate <= dziś`); kafelki „Aktywne” i „Dziś”
  - Pigułki z licznikami (z aktywnych), „Archiwum” ładuje `view=archive`
  - `ContestCard` warianty jak spec §6.3; „+ Zgłoś paragon” → `/konkursy/{id}?zgloszenie=1`; „Oznacz jako kupione” → `PATCH status Bought`; „Oznacz dane jako wysłane” → PUT win z `laureateDataSent:true` (zachowując resztę); menu „⋮”: Edytuj, Duplikuj
  - Pusty stan: „Brak konkursów w tej kategorii”; stopka „Twoje dane widzisz tylko Ty”

- [ ] **Step 1: Testy**

```ts
it.each([["Wedel", 1], ["lidl", 1], ["łoś", 1]])("search %s", ...)  // organizator "E.Wedel", sklep "Lidl", nazwa "Łoś" (szukane "los" też trafia)
it("sort prize puts nulls last", ...)
it("bought card shows ending warning when ≤3 days", ...)
it("planned card mark bought calls PATCH status", ...)
it("won card mark sent keeps prize fields in PUT", ...)
it("archive pill loads archive view", ...)
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): contests screen`

---

### Task 12: Ekran Pilne i Schowek dowodów

**Files:**
- Create: `src/features/reminders/Timeline.tsx`, `ReminderCards.tsx`, `groups.ts`, `src/pages/ProofsPage.tsx` (+ testy)
- Modify: `src/pages/RemindersPage.tsx` (+ test), `src/lib/reminders.ts`

**Interfaces:**
- Consumes: `ReminderDto[]`, `useToggleItem("proof-items" | "win-steps")`, `useSaveWin`, `useSetStatus`, `useProofs`
- Produces:
  - `type ReminderGroup = "laureate"|"results"|"ending"|"ended"|"disposal"`; `groupReminders(r): Record<ReminderGroup, ReminderDto[]>`; kolejność sekcji: laureate, results, ending, ended, disposal
  - Pigułki: Wszystkie, Laureat, Wyniki, Kończące się (ending+ended), Do kosza — z licznikami
  - Nagłówek: „Wymaga Twojej uwagi”, plakietka „{n} alertów” (odmiana: 1 alert, 2–4 alerty, 5+ alertów — funkcja `pluralAlerts(n)`), data i godzina
  - Karty §6.4 wyłącznie z pól `ReminderDto`; kody z przyciskiem kopiowania; linki tylko przez `safeHttpUrl`; „Dodaj zgłoszenie” → `/konkursy/{id}?zgloszenie=1`; ikona aparatu → `/konkursy/{id}?zgloszenie=1&paragon=1`
  - Baner „Schowek dowodów — {n} przechowywanych” → `/dowody`
  - `ProofsPage`: dowody pogrupowane po `location` („Bez miejsca” na końcu), każdy z konkursem, „trzymać do”, notatką i „Wyrzucono”
  - Pusty stan Pilne: „Nic pilnego. Wszystko pod kontrolą!” (jak MVP)

- [ ] **Step 1: Testy**

```ts
it("groups and section order", ...)
it.each([[1,"1 alert"],[3,"3 alerty"],[5,"5 alertów"],[22,"22 alerty"],[12,"12 alertów"]])("pluralAlerts", ...)
it("laureate card toggles step and marks data sent", ...)
it("results card copies confirmation code", ...)
it("disposal card discards proof", ...)
it("proofs page groups by location, no location last", ...)
it("no fabricated copy", () => { /* render wszystkich kart; tekst nie zawiera „§”, „reklamac”, „rezerwow”, „audyt” */ })
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): pilne timeline and proofs vault`

---

### Task 13: Ekran Zakupy (tryb sklepowy)

**Files:**
- Create: `src/features/shopping/storeIcons.ts`, `QuickAddSheet.tsx` (+ testy)
- Modify: `src/pages/ShoppingPage.tsx` (+ test)

**Interfaces:**
- Consumes: `ShoppingGroupDto[]` (z Task 5), `useToggleItem("purchase-items")`, `useContests("active")`, `useContest`, `useSaveContest`
- Produces:
  - `storeIcon(store: string): IconName` — mapa (bez wielkości liter): biedronka, lidl, żabka, kaufland, auchan, carrefour, dino, netto, stokrotka, lewiatan → `storefront`; rossmann, hebe, super-pharm → `spa`; „Dowolny sklep”/inne → `local_mall`
  - Stan sesji: `checked: Set<string>` w komponencie; kliknięcie → natychmiast PATCH `true` + przekreślenie; ponowne → PATCH `false`, przekreślenie znika; błąd → przywrócenie stanu sprzed kliknięcia + alert; lista z serwera łączona z `checked` tak, że odhaczone w tej sesji nie znikają do odświeżenia (`staleTime` nie usuwa ich z widoku)
  - Nagłówek: „Do kupienia: {pozostałe} pozycji w {sklepy} sklepach” + „Dodaj”; pasek postępu = odhaczone w sesji / wszystkie w widoku
  - Sekcje zwijane (domyślnie rozwinięte), plakietka „Koniec za X dni!” gdy `contestEndDate - dziś ≤ 3`, notatka jako wyróżniony dopisek
  - `QuickAddSheet`: wybór konkursu (aktywne), produkt (wymagany), sklep, ilość, notatka → dodanie pozycji przez pobranie konkursu i PUT z dopisaną pozycją
  - Baner na dole: „Po zakupie zrób zdjęcie paragonu” + „Dodaj zgłoszenie” (otwiera `NewEntryPicker`)

- [ ] **Step 1: Testy**

```ts
it("check keeps item crossed out and uncheck restores", ...)
it("failed toggle restores previous state and shows alert", ...)
it("progress bar reflects session checks", ...)
it("ending badge only when ≤3 days", ...)
it("storeIcon maps known chains case-insensitively", ...)
it("quick add PUTs contest with appended purchase and keeps existing ids", ...)
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): shopping mode`

---

### Task 14: Szczegóły konkursu

**Files:**
- Create: `src/features/details/StatusMenu.tsx`, `DetailsHeaderCard.tsx`, `TabsBar.tsx`, `EntriesTab.tsx`, `EntryFormV2.tsx`, `PhotoTile.tsx`, `WinSection.tsx` (+ testy)
- Modify: `src/pages/ContestDetailsPage.tsx` (+ test)
- Delete: `components/EntryCard.tsx`, `EntryForm.tsx`, `WinForm.tsx`, `ChecklistSection.tsx`, `PhotoPicker.tsx` — gdy nieużywane (przenieś testy, zachowaj zachowania: limit 10 MB przed wysłaniem, mapowanie błędów `too_large`/`unsupported_type`)

**Interfaces:**
- Consumes: `ContestDto` (z ikoną, notatkami, `photos`, `win.steps`), hooki wpisów/zdjęć/wygranej/toggle/duplikuj/usuń, `useSetStatus`, `safeHttpUrl`, `formatEntryCounter`
- Produces:
  - Pasek: typ (`typeLabel`), organizator, `StatusMenu` (wszystkie 7 statusów, aktualny zaznaczony) → `PATCH status`
  - Karta główna: ikona (64 px), nazwa, „Strona” / „Regulamin” (tylko `safeHttpUrl`), zakres dat, plakietka „Koniec za X dni” (≤ 3 dni; „Kończy się dziś” przy 0), data wyników, nagroda, liczniki „Limit zgłoszeń” i „Limit na dziś”
  - Zakładki: `Kroki ({done}/{total})`, `Do kupienia`, `Schowek`, `Zgłoszenia` (domyślna); query `?zgloszenie=1` → zakładka Zgłoszenia z otwartym formularzem; `&paragon=1` → dodatkowo od razu wywołuje wybór pliku do odczytu (gdy AI włączone)
  - `EntryFormV2`: nr paragonu, kwota (`parseAmount`), data (domyślnie dziś PL), sklep, e-mail/telefon, kod potwierdzenia (kopiuj), odpowiedź (tylko Creative), zdjęcia z wyborem podpisu, sekcja odczytu AI (Task 15 dostarcza `AiReceiptButton`; tu miejsce i propsy `onExtracted(dto, file)`)
  - Lista zgłoszeń z sumą kwot; `PhotoTile`: miniatura, podpis (`photoLabel`), rozmiar (`formatBytes`), usuń z potwierdzeniem, „Widoczne tylko dla Ciebie”
  - `WinSection`: nagroda, kwota, termin, kroki laureata (odhaczanie, edycja), „Dane wysłane”
  - Notatki; menu „⋮”: Edytuj, Duplikuj (→ edycja kopii jak MVP), Usuń (potwierdzenie „Usunąć konkurs razem ze zdjęciami?”)
  - Bez przycisku „Udostępnij”

- [ ] **Step 1: Testy**

```ts
it("status menu patches status", ...)
it("?zgloszenie=1 opens entries tab with form", ...)
it("tabs show step progress", ...)
it("entry form saves store and photo label", ...)
it("photo over 10MB rejected before upload", ...)       // przeniesiony
it("unsafe urls not linked", ...)                        // przeniesiony
it("delete confirm then navigate", ...)                  // przeniesiony
it("no share button and no fabricated badges", ...)      // brak „Udostępnij”, „Zweryfikowany”, „Czytelne”
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): contest details`

---

### Task 15: Formularz konkursu, wybór ikony i UI odczytu AI

**Files:**
- Create: `src/features/ai/useAiExtract.ts`, `AiFillSection.tsx`, `AiReceiptButton.tsx`, `AiNotice.tsx`, `src/features/contests/IconPicker.tsx` (+ testy)
- Modify: `src/pages/ContestFormPage.tsx` (+ test), `src/features/details/EntryFormV2.tsx`, `src/api/hooks.ts` (`useFeatures`)

**Interfaces:**
- Consumes: `GET /api/features`, `POST /api/ai/receipt`, `POST /api/ai/contest`, `ReceiptExtractionDto`, `ContestExtractionDto`, `CONTEST_ICONS`
- Produces:
  - `useFeatures(): { aiExtraction: boolean }` (przy błędzie → false); przyciski AI ukryte gdy false
  - `AiNotice`: przy pierwszym użyciu modal „Zdjęcie lub plik zostanie wysłany do Google Gemini w celu odczytania danych.” z „Rozumiem”; zapamiętane w `localStorage` `konkursownik-ai-notice=1` (błąd storage → pokazuj za każdym razem)
  - `mergeExtraction<T>(current: T, extracted: Partial<T>, mode: "new"|"edit"): { value: T; aiFields: Set<keyof T> }` — tryb `new`: wypełnia puste pola; tryb `edit`: wypełnia tylko pola, które AI zwróciło niepuste, po potwierdzeniu „Nadpisać {n} pól danymi z AI?”; listy (kroki, zakupy, dowody) dopisywane z `id:null`
  - Oznaczenie pól z AI: plakietka „AI — sprawdź” przy polu; znika po edycji pola
  - `AiFillSection` (formularz konkursu): pole linku + „Odczytaj”, „Wgraj PDF / zrzut”; `page_unreadable` → komunikat „Nie mogę odczytać tej strony. Wgraj regulamin (PDF) albo zrzut ekranu.” i podświetlony przycisk pliku
  - `AiReceiptButton` (formularz zgłoszenia): „Odczytaj z paragonu” → plik → wypełnia sklep, datę, kwotę, nr paragonu; plik trzymany i przy zapisie wysyłany jako zdjęcie `label=Receipt` po utworzeniu zgłoszenia; błąd zdjęcia → zgłoszenie zostaje, przy nim „Nie udało się dodać zdjęcia” + „Spróbuj ponownie”
  - Komunikaty: 422 `extraction_failed` → „Nie udało się odczytać — uzupełnij ręcznie”; 503 → „Odczyt AI jest teraz niedostępny”; 429 `rate_limited` → „Limit odczytów na tę godzinę wyczerpany”; 429 `ai_busy` → „Za dużo odczytów naraz — spróbuj za minutę”
  - `IconPicker`: siatka 20 ikon, `aria-pressed`, wybrana podświetlona; formularz w nowym stylu z sekcjami jak MVP + notatki pozycji i dowodów

- [ ] **Step 1: Testy**

```ts
it("mergeExtraction new fills only empty fields and marks them", ...)
it("mergeExtraction edit asks and overwrites only non-empty extracted", ...)
it("ai field badge disappears after edit", ...)
it("page_unreadable shows file fallback", ...)
it("receipt extraction fills fields and attaches same file as Receipt on save", ...)
it("photo upload failure keeps entry and offers retry", ...)
it("503 and 429 messages, form values intact", ...)
it("ai buttons hidden when feature disabled", ...)
it("notice shown once", ...)
it("icon picker selects icon into payload", ...)
```
- [ ] **Step 2: FAIL** · **Step 3: Implementacja** · **Step 4: PASS**
- [ ] **Step 5: Commit** — `feat(ui): contest form, icon picker, AI fill`

---

### Task 16: Komputer, sprzątanie i sprawdzenie w prawdziwej aplikacji

**Files:**
- Modify: strony/powłoka (klasy responsywne), `docs/superpowers/2026-11-12-konkursownik-followups.md` (dopisz pozycje odłożone w tej rundzie), usunięcie nieużywanych plików (`src/lib/styles.ts` jeśli zbędny, stare komponenty)

**Interfaces:**
- Produces: układ §6.8 (`md:` kolumna max 640 px dla `DetailLayout`, `lg:grid-cols-2` dla listy konkursów, nawigacja `max-w-xl` wyśrodkowana); brak martwego kodu (`npm run lint` czysty, brak nieużywanych eksportów zgłaszanych przez build)

- [ ] **Step 1:** Uruchom `docker compose -f docker-compose.dev.yml up -d`, backend (`dotnet run` w `backend/Konkursownik.Api`) i `npm run dev`. Przejdź w przeglądarce przy 375 px i przy 1280 px, w obu motywach: Pilne, Konkursy (filtry, szukaj, sortuj, szybkie akcje), „+” → nowe zgłoszenie, Szczegóły (status, zakładki, zgłoszenie ze zdjęciem i podpisem), Zakupy (odhacz/odznacz, szybkie dodanie), Statystyki, Zaproszenia, Dowody, formularz z ikoną. Bez klucza Gemini przyciski AI są ukryte.
- [ ] **Step 2:** Popraw znalezione błędy (z testem dla każdego błędu logiki).
- [ ] **Step 3:** `dotnet test`, `npm test`, `npm run build`, `npm run lint`, `bash scripts/smoke.sh` — wszystko zielone.
- [ ] **Step 4: Commit** — `chore(ui): desktop layout and cleanup`
