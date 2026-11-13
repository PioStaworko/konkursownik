# Konkursownik — wiele nagród, konto administratora, podpisy pól

Data: 2026-11-14 · Status: do akceptacji
Buduje na: `docs/superpowers/specs/2026-11-13-redesign-i-ai-design.md` (gałąź `feat/redesign`).

## 1. Po co

Po pierwszych testach właściciel znalazł trzy rzeczy:
1. Konkursy mają zwykle **kilka nagród** (główna, II stopnia, natychmiastowe…), a aplikacja zna tylko jedną.
2. Aplikacja jest prywatna dla znajomych — **zaproszenia ma dawać tylko jedno konto (administrator)**, ustawione w konfiguracji, a nie kod START i nie każdy użytkownik. Logowanie **nickiem** zamiast e-maila, bo aplikacja nic nie wysyła.
3. W formularzu konkursu pola list (do kupienia, do zachowania, …) są **niepodpisane** — nie wiadomo, co gdzie wpisać.

Potem: instrukcja darmowego hostingu (osobno, po wdrożeniu zmian).

## 2. Cele, nie-cele, anty-cele

**Cele:** lista nagród (nazwa, wartość, liczba sztuk) w danych, formularzu, kartach, szczegółach, statystykach i odczycie AI; wygrana wskazuje zdobytą nagrodę; jedno konto administratora z konfiguracji, tylko ono generuje zaproszenia; login nickiem; podpisy pól list.

**Nie-cele:** wielu administratorów, panel zarządzania użytkownikami, zmiana/reset hasła, wysyłka e-maili.

**Anty-cele:** utrata dotychczasowej nagrody istniejących konkursów przy migracji; istniejące konta nie mogą się zalogować; hasło administratora w repozytorium; obcy może przejąć świeżo postawiony serwer, rejestrując się pierwszy.

## 3. Podejścia (wybrane)

| Obszar | Rozważane | Wybrane | Dlaczego |
|---|---|---|---|
| Nagrody w bazie | osobna lista (tabela) / lista w jednym polu tekstowym | **osobna lista** | sortowanie po wartości, statystyki, ten sam wzorzec co inne listy |
| Szczegóły nagrody | A: nazwa, wartość, liczba sztuk + wybór przy wygranej / B: nazwa i wartość | **A** | liczba sztuk mówi o szansach |
| Administrator | konto z konfiguracji / pierwsze zarejestrowane | **konfiguracja** | brak wyścigu o pierwsze konto na nowym serwerze |
| Login | e-mail / nick | **nick** | nic nie wysyłamy, nick prostszy |
| Podpisy | podpis nad polem / sama podpowiedź w polu | **podpis nad polem** | podpowiedź znika przy pisaniu |

## 4. Wiele nagród

**Dane:** nowa encja `ContestPrize { Id, ContestId, Name (wymagana, ≤ 200), Value (decimal?, ≥ 0), Count (int?, > 0), Order }`, kaskada z konkursem. Pola konkursu `PrizeDescription`, `PrizeValue`, `PrizeCount` **usunięte**.

**Migracja:** dla każdego konkursu, który ma `PrizeDescription` lub `PrizeValue`, powstaje jedna nagroda: `Name = PrizeDescription ?? "Nagroda"`, `Value = PrizeValue`, `Count = PrizeCount`, `Order = 0`; dopiero potem kolumny są usuwane (migracja z ręcznym SQL przenoszącym dane).

**API:** `ContestUpsertDto` / `ContestDto` mają `Prizes: [{ id?, name, value, count }]` (zasady PUT jak dla innych list: istniejące id aktualizowane, brakujące usuwane, obce → nowe). Duplikowanie kopiuje nagrody.

**Wygrana:** `Win.PrizeId: Guid?` (nagroda tego konkursu; obca/nieistniejąca → 400). Formularz wygranej: wybór z listy nagród konkursu wypełnia `PrizeWon` i `PrizeValue` (dalej edytowalne), opcja „Inna” zostawia ręczne wpisanie. Usunięcie nagrody z konkursu zeruje `PrizeId` w wygranej (tekst i wartość zostają).

**Karty i szczegóły:**
- Karta konkursu i przypomnienia pokazują **nagrodę o najwyższej wartości** (gdy brak wartości — pierwszą) i dopisek „+N innych”, gdy jest ich więcej.
- Szczegóły: lista wszystkich nagród (nazwa, wartość, „×N”).
- Sortowanie „Wartość” po najwyższej wartości nagrody.
- `ContestCardDto` zamiast pól nagrody ma `TopPrize { name, value, count }?` i `PrizesCount`.

**Statystyki:** bez zmian w znaczeniu — „wartość wygranych” = suma `Win.PrizeValue`.

**AI (odczyt konkursu):** schemat i mapowanie zwracają `prizes: [{ name, value, count }]` (pozycje bez nazwy pomijane, ujemne wartości / liczby ≤ 0 → null). Formularz dopisuje je do listy nagród z oznaczeniem „AI — sprawdź”.

## 5. Konto administratora i nicki

**Konfiguracja:** `Admin__UserName`, `Admin__Password` (lokalnie user-secrets, na serwerze `.env` → `ADMIN_USERNAME`, `ADMIN_PASSWORD` przekazane w `docker-compose.yml`). Usunięte: `Invites:BootstrapCode`, `BOOTSTRAP_CODE`, logika bootstrapu.

**Przy starcie aplikacji:** jeśli `Admin:UserName` ustawione — gdy konto o tej nazwie (bez rozróżniania wielkości liter) nie istnieje, zostaje utworzone z `Admin:Password`; nadawane jest uprawnienie administratora (rola `Admin`). Gdy konto istnieje, tylko nadaje rolę — hasło ze zmiennych **nie** nadpisuje istniejącego. Brak konfiguracji → aplikacja działa, ale nikt nie może zapraszać (log ostrzeżenia). Hasło za słabe (< 8 znaków) → błąd startu z czytelnym komunikatem.

**Uprawnienia:** `POST/GET /api/invites` tylko dla roli `Admin` (inni → 403). `GET /api/auth/me` zwraca `{ userName, isAdmin }`. UI: „Zaproszenia” w menu profilu tylko dla administratora.

**Nicki:** rejestracja `{ userName, password, inviteCode }`, logowanie `{ userName, password }`. Nick: 3–32 znaki, `a–z A–Z 0–9 . _ -`, unikalny bez rozróżniania wielkości liter. E-mail przestaje być wymagany. Istniejące konta logują się dotychczasowym loginem (ich nazwą użytkownika jest dawny e-mail — dopuszczony przy logowaniu, nawet jeśli nie spełnia reguł nowego nicku).

**Lokalna baza dev:** właściciel może wpisać jako `Admin:UserName` login istniejącego konta (np. `tester@konkursownik.test`) — dostanie ono rolę.

## 6. Podpisy pól list

W formularzu konkursu każda pozycja list ma podpis nad polem:
- **Do zrobienia:** „Krok”.
- **Do kupienia:** „Produkt”, „Sklep”, „Ilość lub kwota” (podpowiedź: „np. 2 szt., min. 20 zł”), „Notatka”.
- **Do zachowania:** „Co zachować” (podpowiedź: „np. paragon, opakowanie”), „Trzymać do”, „Gdzie leży”, „Notatka”.
- **Nagrody (nowe):** „Nagroda”, „Wartość (zł)”, „Liczba sztuk”.
- **Kroki laureata:** „Krok”.

Podpisy powiązane z polami (dostępność: `label`/`for`), numer pozycji w nagłówku elementu („Produkt 2”).

## 7. Ograniczenia
- Wszystkie zasady poprzednich specyfikacji obowiązują (404 dla cudzych zasobów, „dziś” w Europe/Warsaw, AI tylko wypełnia formularz, brak zmyślonych treści).
- Testy dla migracji nagród (dane przeniesione), uprawnień zaproszeń (nie-admin → 403), zakładania/nadawania roli administratora, logowania nickiem i starym e-mailem.
- `docs/deploy.md` i `.env.example` zaktualizowane (nowe zmienne, usunięty kod bootstrap).

## 8. Decyzje pozostawione builderowi
- Kształt komponentów formularza nagród i wyboru nagrody przy wygranej (w stylu istniejących list).
- Sposób oznaczenia roli (ASP.NET Identity roles vs. flaga na użytkowniku) — byle `isAdmin` w `/me` i autoryzacja zaproszeń.
