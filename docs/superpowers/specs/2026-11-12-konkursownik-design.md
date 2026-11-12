# Konkursownik — specyfikacja

Data: 2026-11-12 · Status: do akceptacji

## 1. Cel

Strona (głównie na telefon) do prowadzenia konkursów „za paragony” i podobnych akcji promocyjnych:
co kupić i gdzie, co zrobić, co zachować, kiedy są wyniki i terminy — z przypomnieniami i archiwum.

**Użytkownicy:** grupa znajomych (kilka–kilkanaście osób), każdy z własnym kontem.
**Prywatność:** każdy widzi wyłącznie swoje dane. Paragony i ich zdjęcia to dane wrażliwe — brak
jakiegokolwiek wspólnego wglądu, brak konta administratora z dostępem do cudzych danych.

**Sukces:** użytkownik nie przegapia końca konkursu, dnia wyników, terminu laureata ani nie wyrzuca
paragonu za wcześnie; przed wyjściem do sklepu widzi jedną listę zakupów pogrupowaną po sklepach.

## 2. Decyzje

| Temat | Decyzja |
|---|---|
| Frontend | React + TypeScript (Vite), mobile-first, UI po polsku |
| Backend | ASP.NET Core (.NET 10) Minimal API + EF Core |
| Baza | PostgreSQL (łatwa przenośność na selfhost) *(domyślne — do potwierdzenia)* |
| Hosting etap 1 | Azure App Service (jedna aplikacja serwuje API i zbudowany React — jedna domena, ciasteczka bez problemów cross-site); zdjęcia w Azure Blob Storage (prywatny kontener); Postgres: Neon (darmowy) lub Azure Database for PostgreSQL z kredytów |
| Hosting etap 2 | Selfhost u znajomego: `docker compose` (aplikacja + Postgres + wolumen na zdjęcia) |
| Konta | ASP.NET Core Identity, logowanie ciasteczkiem; rejestracja tylko z kodem zaproszenia |
| Przypomnienia | Etap 1: tylko w aplikacji (ekran „Pilne”). Etap 2 (poza zakresem tego planu): PWA + push |

## 3. Model danych

**Konkurs:** nazwa, organizator, link do strony, link do regulaminu, typ (loteria / zadanie
konkursowe), nagroda (opis, wartość, liczba nagród), data startu, data końca, data wyników
(opcjonalna), gdzie sprawdzać wyniki (tekst), limit zgłoszeń dziennie i łącznie (opcjonalne),
status, notatki.

Elementy konkursu:
- **Do zrobienia** — lista kroków (tekst, zrobione, kolejność).
- **Do kupienia** — produkt, sklep (opcjonalny), ilość/kwota (tekst, np. „2 szt.”, „min. 20 zł”), kupione.
- **Do zachowania** — co (paragon / opakowanie / kod…), do kiedy trzymać (opcjonalnie), gdzie leży, wyrzucone.
- **Zgłoszenia** (wiele) — data, kod potwierdzenia, nr paragonu, kwota zakupu, użyty e-mail/telefon,
  treść odpowiedzi, zdjęcia (paragon, opakowanie).
- **Wygrana** (0/1) — co wygrane, wartość, termin przesłania danych laureata, „dane wysłane”.

Poza zakresem (decyzja użytkownika): status odbioru nagrody, informacja o podatku.

## 4. Statusy

Planowany → Kupione → Zgłoszony → Czekam na wyniki → Wygrana / Przegrana → Archiwum.

Status ustawia użytkownik ręcznie, z jedną regułą automatyczną *(domyślne — do potwierdzenia)*:
konkurs w statusie „Zgłoszony” po dacie końca jest pokazywany jako „Czekam na wyniki”.

**Archiwum** = status Archiwum lub Przegrana, albo Wygrana bez oczekującego terminu laureata.
Reszta to konkursy aktywne.

## 5. Przypomnienia (ekran „Pilne”)

Wyliczane z dat przy każdym wejściu, „dziś” liczone w strefie Europe/Warsaw:

| Rodzaj | Warunek | Tekst |
|---|---|---|
| Kończy się | status Planowany/Kupione, koniec za 0–3 dni | „Kończy się {data} — zgłoś się” |
| Zakończony | status Planowany/Kupione, koniec minął | „Konkurs się zakończył — zaktualizuj status” |
| Wyniki | status (efektywny) Zgłoszony/Czekam na wyniki, data wyników ≤ dziś | „Wyniki: {data} — sprawdź maila” |
| Termin laureata | wygrana z terminem, dane niewysłane, termin ≤ dziś + 7 dni | „Termin danych laureata: {data}” |
| Można wyrzucić | element „do zachowania” niewyrzucony, „do kiedy” < dziś (także w archiwum) | „Możesz wyrzucić: {co}” |

Sortowanie rosnąco po dacie.

## 6. Pozostałe funkcje

- **Lista zakupów:** niekupione pozycje z aktywnych konkursów, które jeszcze się nie skończyły,
  pogrupowane po sklepie (porównanie bez wielkości liter i spacji na brzegach; brak sklepu → „Dowolny sklep”).
  Odhaczenie „kupione” prosto z listy.
- **Licznik zgłoszeń:** „3/5” i „dziś: 1/1” przy konkursie. Tylko informacyjnie — API nie blokuje.
- **Duplikowanie konkursu:** kopiuje dane, kroki, zakupy i rzeczy do zachowania (z wyzerowanymi
  odhaczeniami), status = Planowany; nie kopiuje zgłoszeń ani wygranej.
- **Statystyki:** liczba konkursów, zgłoszeń, wygranych; suma kwot zakupów ze zgłoszeń; suma wartości wygranych.
- **Zaproszenia:** każdy zalogowany może wygenerować kod zaproszenia (jednorazowy). Pierwsze konto
  zakłada się kodem z konfiguracji (`Invites:BootstrapCode`), ważnym tylko, gdy w bazie nie ma żadnego użytkownika.
- **Zdjęcia:** robione aparatem telefonu z formularza zgłoszenia; JPEG/PNG/WebP/HEIC, maks. 10 MB.

## 7. Bezpieczeństwo i prywatność

- Każde zapytanie filtrowane po właścicielu; cudzy zasób → **404** (nie zdradzamy, że istnieje).
- Zdjęcia nigdy nie są publiczne: prywatny kontener, wydawane tylko przez API po sprawdzeniu właściciela.
- Usunięcie konkursu/zgłoszenia usuwa też pliki zdjęć.
- Hasło min. 8 znaków; blokada po wielu nieudanych próbach (domyślna w Identity).
- Brak wysyłki e-maili w etapie 1 → brak resetu hasła przez e-mail (poza zakresem).

## 8. Poza zakresem etapu 1

Push/PWA, reset hasła e-mailem, OCR paragonów, udostępnianie konkursów innym, status odbioru nagrody, podatek.
