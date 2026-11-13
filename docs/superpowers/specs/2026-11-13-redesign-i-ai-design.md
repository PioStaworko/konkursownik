# Konkursownik — nowy wygląd, rozszerzone dane i odczyt przez AI

Data: 2026-11-13 · Status: zaakceptowana (2026-11-13)
Poprzednia specyfikacja (MVP, obowiązuje dalej tam, gdzie ta nic nie zmienia): `docs/superpowers/specs/2026-11-12-konkursownik-design.md`
Makiety (źródło wyglądu): `docs/design/mockups/konkursy.html`, `pilne.html`, `zakupy.html`, `szczegoly.html`

## 1. Po co

MVP działa, ale jest surowe. Właściciel przygotował makiety, które pokazują, jak aplikacja ma **wyglądać** i jak ma **działać**: bogatsze karty, szybkie akcje, oś czasu pilnych spraw, tryb sklepowy. Do tego chce, żeby żmudne przepisywanie danych z paragonu i z regulaminu robiło AI (Gemini), a on tylko sprawdzał i zatwierdzał.

Użytkownicy jak dotąd: kilka–kilkanaście znajomych osób, głównie na telefonach. Każdy widzi tylko swoje dane.

**Sukces:** dodanie paragonu przy kasie i dodanie nowego konkursu z linku zajmują chwilę; ekrany wyglądają jak makiety; nic, co pokazuje aplikacja, nie jest zmyślone.

## 2. Cele, nie-cele, anty-cele

**Cele**
- Wygląd i układ wszystkich ekranów zgodny ze stylem makiet (ciemny motyw domyślnie, jasny dostępny).
- Dane i akcje, które makiety pokazują, a których dziś brakuje (§4).
- Odczyt paragonu i konkursu przez Gemini, wypełniający formularz do sprawdzenia (§5).
- Przyzwoity widok na komputerze (§6.7).

**Nie-cele (nie w tej rundzie)**
- Zdjęcie/obrazek konkursu (wybrano samą ikonę).
- Sklep jako osobny obiekt (podpisy przy sklepach typu „Wymóg: paragon papierowy” — pomijamy; taki wymóg wpisuje się w notatce pozycji).
- Udostępnianie danych zgłoszenia (przycisk „share” z makiety pomijamy).
- PWA, push, reset hasła, automatyczne dopasowywanie produktów z paragonu do listy zakupów.

**Anty-cele (porażka, nawet jeśli działa)**
- AI zapisuje cokolwiek bez zatwierdzenia przez użytkownika.
- UI pokazuje treści, których nikt nie wpisał ani nie wynikają z danych (np. „Zweryfikowany”, „§12 ust. 4”, „szyfrowane”, „pula 30 000 zł”).
- Nowy endpoint zwraca lub zmienia cudze dane (każdy zasób po id → 404 dla obcego, jak w MVP).
- Klucz API Gemini trafia do przeglądarki.

## 3. Podejścia (wybrane przez właściciela)

| Obszar | Rozważane | Wybrane | Dlaczego |
|---|---|---|---|
| Przeniesienie wyglądu | A: tokeny z makiet → motyw Tailwind 4 (zmienne CSS, ciemny+jasny) + wspólne komponenty; B: kopiowanie HTML makiet ekran po ekranie; C: biblioteka komponentów | **A** | jedna zmiana stylu = jedna edycja; B dubluje style ×4; C walczy ze stylem makiet |
| Czcionki i ikony | A: Geist, JetBrains Mono, Material Symbols jako paczki npm (ikony jako SVG, tylko użyte); B: Google Fonts z CDN | **A** | szybciej na telefonie, bez zapytań do Google przy każdym wejściu, ikony ~kilkadziesiąt KB zamiast ~3 MB |
| Odczyt AI | A: backend woła Gemini z wymuszonym schematem JSON; B: przeglądarka woła Gemini | **A** | B ujawnia klucz API |
| Obrazek konkursu | ikona z listy / własne zdjęcie / oba | **ikona** | szybkie przy każdym konkursie, bez uploadu |
| Przycisk „+” | panel wyboru / tylko konkurs / tylko zgłoszenie | **panel wyboru** | „mam paragon, zapisz” w 2 kliknięciach z dowolnego ekranu |
| Wejście dla konkursu | link / PDF-zrzut / oba | **link, a gdy strona się nie odczyta — PDF albo zrzut** | wygoda linku, niezawodność pliku |
| Kolejność prac | dane → AI → wygląd | **jak obok** | AI i nowe ekrany potrzebują nowych pól |

## 4. Etap 1 — rozszerzenie danych (backend + typy frontendu)

Wszystkie nowe pola opcjonalne (nullable), migracja EF dodaje kolumny bez utraty danych. Walidacja jak w MVP (400 ValidationProblem), własność jak w MVP (404).

### 4.1 Ikona konkursu
- `Contest.Icon: string?` — klucz z zamkniętej listy ok. 20 ikon (Material Symbols), np. `emoji_events` (domyślna), `cookie`, `coffee`, `local_drink`, `icecream`, `storefront`, `shopping_basket`, `spa` (kosmetyki), `cleaning_services`, `pets`, `child_care`, `checkroom`, `devices`, `sports_esports`, `local_pizza`, `liquor`, `directions_car`, `flight`, `redeem`, `card_giftcard`. Ostateczną listę ustala builder; ta sama lista w backendzie (walidacja) i frontendzie (wybór + render).
- Nieznany klucz → 400. `null` → UI pokazuje ikonę domyślną.
- Pole w `ContestUpsertDto`, `ContestDto`, podsumowaniach; kopiowane przy duplikowaniu.

### 4.2 Szybka zmiana statusu
- `PATCH /api/contests/{id}/status` body `{ "status": "<ContestStatus>" }` → 204 | 400 | 404. Zmienia tylko status.

### 4.3 Zgłoszenie: sklep
- `Entry.Store: string?` (≤ 100). W `EntryUpsertDto`/`EntryDto`.

### 4.4 Zdjęcie: podpis
- `Photo.Label: PhotoLabel` — enum `Receipt | Packaging | Code | Other` (PL: Paragon, Opakowanie, Kod, Inne), domyślnie `Receipt`.
- Upload przyjmuje opcjonalne pole formularza `label`; `PATCH /api/photos/{id}` body `{ "label": … }` → 204 | 400 | 404.
- `EntryDto.PhotoIds` zastąpione przez `EntryDto.Photos: [{ id, label, sizeBytes }]` (frontend aktualizowany w tym samym etapie).

### 4.5 Notatki
- `PurchaseItem.Note: string?` (≤ 300) i `ProofItem.Note: string?` (≤ 300). W DTO, formularzu konkursu i duplikowaniu.

### 4.6 Kroki laureata
- Nowa encja `WinStep { Id, WinId, Text, Done, Order }` (kaskada z `Win`).
- `WinDto.Steps: [{ id?, text, done }]`; `PUT /api/contests/{id}/win` zastępuje kroki według tych samych zasad co dzieci konkursu w PUT (istniejące id aktualizowane, brakujące usuwane, obce/nieznane id → nowe).
- `PATCH /api/win-steps/{id}` `{ "value": bool }` → 204 | 404 (własność przez Win → Contest).

### 4.7 Lista zakupów — więcej kontekstu
- `ShoppingItemDto` dostaje `ContestEndDate`, `ContestIcon`, `Note`.

### 4.8 Widok wszystkich dowodów
- `GET /api/proofs` → niewyrzucone `ProofItem` wszystkich konkursów użytkownika (także archiwalnych): `{ id, contestId, contestName, contestIcon, what, keepUntil, location, note }`, sortowane po `keepUntil` (null na końcu). Wyrzucanie — istniejący `PATCH /api/proof-items/{id}`.

### 4.9 Dane dla bogatych kart (lista konkursów i „Pilne”)
Karty z makiet pokazują więcej niż dzisiejsze `ContestSummaryDto`. Lista konkursów i przypomnienia muszą zwracać (bez N+1 po stronie przeglądarki), oprócz obecnych pól:
- organizer, icon, type, prizeDescription, prizeValue, entryLimitPerDay, entriesToday, url, rulesUrl;
- liczba pozycji zakupu i kupionych; pierwsza niekupiona pozycja (product, quantity, store, note); lista nazw sklepów z pozycji (do wyszukiwarki);
- miejsce przechowywania pierwszego niewyrzuconego dowodu;
- wygrana (prizeWon, prizeValue, laureateDeadline, laureateDataSent, kroki z postępem);
- dla przypomnień „Wyniki”: kody potwierdzenia zgłoszeń; dla „Do kosza”: location i note dowodu, data końca konkursu; dla „Kończy się / Zakończony”: kupione pozycje (product, quantity).

Kształt DTO (jedno wspólne „podsumowanie karty” + pola specyficzne dla rodzaju przypomnienia, czy osobne typy) — decyzja buildera.

## 5. Etap 2 — odczyt przez Gemini

### 5.1 Zasady
- AI tylko **wypełnia formularz**. Zapis wyłącznie po kliknięciu „Zapisz” przez użytkownika. Pola wypełnione przez AI są w formularzu oznaczone („uzupełnione przez AI — sprawdź”), oznaczenie znika po edycji pola.
- Klucz i wywołania wyłącznie po stronie serwera. Konfiguracja: `Gemini:ApiKey`, `Gemini:Model` (nazwa modelu w ustawieniach, nie w kodzie; domyślnie aktualny szybki model wielomodalny z dokumentacji Gemini w chwili wdrożenia), `Gemini:TimeoutSeconds`.
- Bez klucza funkcja jest wyłączona: `GET /api/features` → `{ "aiExtraction": false }`, endpointy AI → 503 `{ "error": "ai_unavailable" }`, UI ukrywa przyciski AI.
- Odpowiedź w wymuszonym schemacie JSON (structured output). Prompt po polsku: daty jako `YYYY-MM-DD`, kwoty jako liczby, **null gdy brak w źródle — nigdy nie zgadywać**.
- Przy pierwszym użyciu jednorazowa informacja: „Zdjęcie/plik zostanie wysłany do Google Gemini w celu odczytania danych” (zapamiętana w przeglądarce). Właściciel akceptuje przekazanie danych do Google; przed wdrożeniem należy sprawdzić aktualne warunki Gemini API dot. wykorzystania danych (plan darmowy vs płatny, zasady dla EOG) i opisać wynik w `docs/deploy.md`.
- Limit użycia na użytkownika (np. 30 odczytów/godz.) → 429 `{ "error": "rate_limited" }`. Wartość — decyzja buildera, w konfiguracji.
- Integracja za interfejsem (np. `IGeminiExtractor`); testy używają atrapy, **żadnych prawdziwych wywołań w testach**.

### 5.2 Paragon
- `POST /api/ai/receipt` multipart `file` (obraz; te same typy i limit 10 MB i rozpoznawanie po bajtach co zdjęcia) → `{ store, date, amount, receiptNumber, products: [{ name, price }] }`, każde pole nullable. Nic nie zapisuje.
- UI: w formularzu zgłoszenia przycisk „Odczytaj z paragonu” → aparat/galeria → wypełnienie sklepu, daty, kwoty, nr paragonu. **To samo zdjęcie** zostaje dołączone do zgłoszenia jako `Paragon` przy zapisie (bez ponownego wybierania pliku).
- Błąd odczytu → 422 `{ "error": "extraction_failed" }` → komunikat „Nie udało się odczytać paragonu — uzupełnij ręcznie”, formularz zostaje.

### 5.3 Konkurs
- `POST /api/ai/contest` przyjmuje **albo** JSON `{ "url": "https://…" }`, **albo** multipart `file` (PDF do 15 MB rozpoznawany po `%PDF`, lub obraz jak wyżej).
- Odpowiedź: pola formularza konkursu — name, organizer, url, rulesUrl, type, icon (propozycja z listy §4.1), prizeDescription, prizeValue, prizeCount, startDate, endDate, resultsDate, resultsCheckNote, entryLimitPerDay, entryLimitTotal, tasks[], purchases[{ product, store, quantity, note }], proofs[{ what, keepUntil, note }], notes. Wszystko nullable/puste. Nic nie zapisuje.
- **Pobieranie strony (link):** tylko http/https; DNS rozwiązywany przed połączeniem, odrzucane adresy prywatne/loopback/link-local/metadanych; każde przekierowanie (maks. 3) sprawdzane tak samo; limit 2 MB i 10 s; HTML → czysty tekst. Gdy pobranie się nie uda albo tekstu jest za mało, by coś odczytać → 422 `{ "error": "page_unreadable" }` → UI: „Nie mogę odczytać tej strony. Wgraj regulamin (PDF) albo zrzut ekranu.” z przyciskiem wyboru pliku.
- UI: na górze formularza nowego konkursu sekcja „Wypełnij automatycznie” (pole na link + „Wgraj PDF / zrzut”). Działa też w edycji (nadpisuje tylko pola, które AI zwróciło niepuste — po potwierdzeniu).

## 6. Etap 3 — nowy wygląd

### 6.1 System wizualny
- Kolory, promienie, odstępy i skala typografii z makiet (konfiguracja `tailwind.config` w każdej makiecie — identyczna) jako tokeny motywu Tailwind 4 (`@theme` + zmienne CSS). Ciemny motyw = wartości z makiet. **Jasny motyw**: odpowiedniki z tej samej palety (primary indygo `#8083ff`/`#c0c1ff`, secondary zieleń `#4edea3`, tertiary bursztyn `#ffb95f`, error) — dobór buildera, kontrast WCAG AA dla tekstu w obu motywach.
- Domyślnie ciemny; przełącznik w nagłówku; wybór zapamiętany w przeglądarce (klasa na `<html>` ustawiana przed renderem, bez mignięcia).
- Czcionki Geist (tekst) i JetBrains Mono (liczby, daty, kody) z paczek npm; ikony Material Symbols Outlined jako SVG z paczki npm, importowane pojedynczo.
- Animacje (`ping`, `pulse`, `bounce`) wyłączone przy `prefers-reduced-motion`.
- Wspólne komponenty (nazwy — decyzja buildera): karta, plakietka statusu (kolor wg statusu jak w makietach), pigułka filtra z licznikiem, sekcja z ikoną i tytułem, duże pole odhaczania 44×44, panel wysuwany od dołu (bottom sheet), przycisk główny/drugorzędny/ikonowy, pole formularza.

### 6.2 Powłoka aplikacji
- **Nagłówek** (stały, rozmyte tło): napis „Konkursownik” (bez logo) + nazwa ekranu (na szerszych ekranach); przełącznik motywu; okrągła ikona profilu → menu: e-mail użytkownika, „Zaproszenia”, „Wyloguj”. Na podstronach (szczegóły, formularz, dowody, zaproszenia) zamiast napisu: „Wróć” + tytuł.
- **Dolna nawigacja** (ekrany główne): Konkursy · Pilne (plakietka: liczba przypomnień) · **„+”** · Zakupy (plakietka: liczba niekupionych pozycji) · Statystyki. Ekrany szczegółów i formularzy — bez dolnej nawigacji.
- **„+” → panel**: „Nowy konkurs” (formularz z sekcją „Wypełnij automatycznie”) oraz „Nowe zgłoszenie / paragon” → lista konkursów, do których można się zgłosić (niezakończone, niezarchiwizowane; posortowane po dacie końca; przy każdym licznik „dziś x/y”) → szczegóły wybranego konkursu z otwartym formularzem zgłoszenia.
- Ekran startowy po zalogowaniu: **Pilne** (decyzja właściciela). Kolejność zakładek w nawigacji jak w makiecie.

### 6.3 Konkursy (`konkursy.html`)
- Pasek: kropka + „Panel” + dzisiejsza data; plakietka z liczbą pilnych na dziś.
- Kafelki: „Aktywne” (liczba aktywnych) i „Dziś” (przypomnienia z terminem dziś lub wcześniej).
- Pigułki filtrów z licznikami: Wszystkie, Planowane, Kupione, Zgłoszone, Czekam na wyniki, Wygrana, Archiwum (status efektywny jak w MVP; Archiwum = widok archiwum z MVP).
- Wyszukiwarka (nazwa, organizator, sklepy z pozycji) i sortowanie (Termin / Wartość nagrody / Ostatnio dodane — decyzja buildera co do zestawu).
- Karty zależne od stanu, jak w makiecie: Kupione → ostrzeżenie o końcu (gdy ≤ 3 dni) + licznik dziś, nagroda, limit, miejsce dowodu, akcje „+ Zgłoś paragon”, „Duplikuj”, „⋮”; Planowany → pierwsza pozycja do kupienia + kupione/wszystkie, nagroda, „Oznacz jako kupione” (szybki status); Czekam na wyniki → data wyników + liczba zgłoszeń; Wygrana → nagroda + kwota, termin laureata, przycisk „Oznacz dane jako wysłane” (gdy niewysłane). Kliknięcie karty → szczegóły.
- Pusty stan jak w makiecie. Stopka prywatności zamiast „100% lokalnych i szyfrowanych”: „Twoje dane widzisz tylko Ty”.

### 6.4 Pilne (`pilne.html`)
- Nagłówek „Wymaga Twojej uwagi” + liczba alertów + data/godzina.
- Pigułki: Wszystkie, Laureat, Wyniki, Kończące się (Kończy się + Zakończony), Do kosza — z licznikami.
- Oś czasu z węzłami-ikonami, sekcje w kolejności pilności: Termin laureata → Wyniki → Kończy się → Zakończony → Do kosza (w sekcji wg daty).
- Karty jak w makiecie, wyłącznie z danych: laureat (nagroda, kwota, termin, kroki laureata z odhaczaniem, „Oznacz jako dane wysłane”, „Regulamin” jeśli link jest); wyniki (kody zgłoszeń z kopiowaniem, link do strony konkursu); kończy się (kupione pozycje, „Dodaj zgłoszenie”, ikona aparatu → zgłoszenie z odczytem paragonu); zakończony (przypomnienie o zmianie statusu + szybka zmiana statusu); do kosza (co, gdzie leży, notatka, „Wyrzucono”).
- Baner na dole: „Schowek dowodów — N przechowywanych” → ekran Dowody (§6.8).
- Usunąć zmyślone treści makiety (paragraf regulaminu, „okres reklamacji”, „lista rezerwowa”, „loteria audytowana”, „pula”).

### 6.5 Zakupy (`zakupy.html`)
- Pasek „Tryb sklepowy”: „Do kupienia: N pozycji w M sklepach” + „Dodaj” (szybkie dodanie pozycji: wybór konkursu + produkt/sklep/ilość/notatka).
- Pasek postępu odhaczania w bieżącej sesji.
- Sekcje sklepów zwijane, ikona sklepu z małej mapy nazw (Biedronka, Lidl, Rossmann, Żabka, Kaufland, Auchan, Carrefour, Hebe, Dino, Netto…; reszta — ikona ogólna), licznik pozycji. „Dowolny sklep” na końcu.
- Pozycja: plakietka „Koniec za X dni!” (gdy ≤ 3 dni), nazwa konkursu, produkt, ilość/wymóg, notatka (jako wyróżniony dopisek), duże pole odhaczania.
- **Odhaczona pozycja zostaje przekreślona** (zapis do serwera natychmiast) i można ją odznaczyć; znika dopiero po odświeżeniu/ponownym wejściu.
- Dolny baner: „Po zakupie zrób zdjęcie paragonu” → „Dodaj zgłoszenie” (ten sam przepływ co „+”) zamiast „Skanuj paragon / Przypisz schowek”.

### 6.6 Szczegóły konkursu (`szczegoly.html`)
- Nagłówek: „Wróć” + „Szczegóły konkursu”; pasek: typ, organizator, **pigułka statusu z rozwijaną listą** (szybki status, wszystkie statusy).
- Karta główna: duża ikona konkursu, nazwa, linki „Strona” / „Regulamin” (tylko http/https jak w MVP), zakres dat + plakietka „Koniec za X dni”, data wyników, nagroda, liczniki limitów łącznie i dziś.
- Zakładki: **Kroki (x/y)** · **Do kupienia** · **Schowek** · **Zgłoszenia** (domyślna). Kroki/zakupy/schowek z odhaczaniem; schowek pokazuje miejsce, „trzymać do”, notatkę.
- Zgłoszenia: przycisk „Zarejestruj nowe zgłoszenie”, formularz (nr paragonu, kwota, data, sklep, e-mail/telefon, kod potwierdzenia z kopiowaniem, odpowiedź przy konkursach z zadaniem, zdjęcia z podpisem i usuwaniem, „Odczytaj z paragonu”), lista zgłoszeń z sumą kwot. Bez przycisku „Udostępnij”.
- Sekcje spoza makiety w tym samym stylu: Wygrana (nagroda, termin, kroki laureata, „dane wysłane”), Notatki, menu „⋮”: Edytuj / Duplikuj / Usuń (z potwierdzeniem jak w MVP).
- Teksty: bez „Czytelne”, „EAN-13…”, „Zweryfikowany”, „Potwierdzony”, „100% prywatne / szyfrowane” (zamiast: „Widoczne tylko dla Ciebie”), „Regulamin” zamiast „Regulamin PDF”.

### 6.7 Ekrany bez makiet (w tym samym stylu)
- **Formularz konkursu** (nowy/edycja): sekcja „Wypełnij automatycznie” (§5.3), wybór ikony (siatka), pola jak w MVP + nowe (notatki pozycji i dowodów), oznaczenia pól z AI.
- **Statystyki**: kafelki (konkursy, zgłoszenia, wygrane, wydane, wartość wygranych, bilans) w stylu kafelków z Konkursów.
- **Zaproszenia** (z menu profilu): generowanie i lista kodów (wolny/zużyty, kopiuj).
- **Dowody** (§4.8): lista przechowywanych dowodów pogrupowana wg miejsca (`location`), z „Wyrzucono”.
- **Logowanie / Rejestracja**: wyśrodkowana karta w nowym stylu.

### 6.8 Komputer
- Mobile-first bez zmian zachowania. Od ~768 px treść w wyśrodkowanej kolumnie (max ok. 640 px dla szczegółów i formularzy); od ~1024 px karty Konkursów w 2 kolumnach (max szerokość jak w makietach, `max-w-7xl`). Dolna nawigacja zostaje, wyśrodkowana (`max-w-xl`).

## 7. Ograniczenia i jakość
- Wszystkie zasady MVP obowiązują (Europe/Warsaw jako „dziś”, 404 dla cudzych zasobów, zdjęcia nigdy publiczne, jedna domena).
- Każdy etap kończy się zielonymi testami backendu i frontendu oraz działającą aplikacją; etap 1 nie psuje obecnego UI.
- Nowe endpointy mają testy własności (obcy użytkownik → 404) i walidacji.
- Testy AI na atrapie; osobny test ochrony pobierania strony (adres prywatny, przekierowanie na adres prywatny, zbyt duża strona).
- Dostępność: cele dotyku ≥ 44 px, etykiety przycisków ikonowych, kontrast AA w obu motywach.
- Pakiety z npm/NuGet: aktualne stabilne wersje.

## 8. Doprecyzowania (decyzje autora dokumentu po przeglądzie)
- **Zdjęcie z odczytu paragonu (§5.2):** plik trzymany w przeglądarce; przy „Zapisz” najpierw powstaje zgłoszenie, potem istniejącym endpointem wysyłane jest zdjęcie z `label=Receipt`. Gdy zgłoszenie się zapisze, a zdjęcie nie — zgłoszenie zostaje, użytkownik widzi błąd przy zgłoszeniu z przyciskiem „Spróbuj ponownie”. Bez tymczasowego magazynu na serwerze.
- **Limit odczytów AI (§5.1):** licznik w pamięci procesu (jedna instancja), liczone wszystkie wywołania endpointów AI, także nieudane. Restart zeruje licznik — akceptowalne.
- **Duplikowanie:** kopiuje ikonę oraz notatki pozycji i dowodów (z wyzerowanymi odhaczeniami jak w MVP); **nie** kopiuje wygranej, kroków laureata, zgłoszeń ani zdjęć.
- **`PhotoIds` → `Photos` (§4.4):** w etapie 1 aktualizowane są też typy i komponenty obecnego frontendu, tak żeby obecny UI działał bez zmian wyglądu.
- **Przypomnienia:** reguły i progi z MVP bez zmian (np. „Kończy się” = 0–3 dni); etapy 1 i 3 tylko rozszerzają dane i wygląd.
- **Odpowiedź AI spoza zamkniętych list** (`type`, `icon`, daty w złym formacie): serwer zamienia takie wartości na `null`, nie zwraca błędu.

## 9. Decyzje pozostawione builderowi (oznaczone jako jego)
- Ostateczna lista ~20 ikon i mapa ikon sklepów.
- Kształt DTO dla bogatych kart i przypomnień (§4.9).
- Paleta jasnego motywu (w ramach kontrastu AA).
- Zestaw opcji sortowania na liście konkursów.
- Limit odczytów AI na godzinę i limity rozmiarów poza podanymi.
