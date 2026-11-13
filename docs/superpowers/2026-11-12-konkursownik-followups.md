# Konkursownik — rzeczy odłożone na później (po MVP)

Zebrane z recenzji zadań i końcowego przeglądu. Żadna nie blokuje używania aplikacji przez znajomych.

## Warto zrobić przed szerszym użyciem
- Kwoty ≥ 100 000 000 lub ujemna liczba nagród → błąd 500 zamiast 400 (`AppDbContext` decimal(10,2), brak górnej granicy w walidacji).
- Zablokowane konto (po wielu błędnych hasłach) widzi komunikat „zły e-mail lub hasło” — warto osobny kod `locked_out`.
- Zdjęcia paragonów są cache'owane w przeglądarce przez dobę (`Cache-Control: private, max-age=86400`) — rozważyć `no-store`.
- Brak zmiany/resetu hasła (świadomie poza zakresem etapu 1); przy dodaniu zmiany hasła włączyć walidację security stamp (`AddIdentityCookies`).
- Miniatury to pełne zdjęcia do 10 MB — przy etapie 2 generować małe podglądy.

## Instrukcja wdrożenia (`docs/deploy.md`)
- Na Windows brak `zip` i `openssl` w Git Bash — dopisać alternatywy (PowerShell `Compress-Archive`, generowanie haseł).
- Wyjaśnić, co dokładnie otwiera `--public-access 0.0.0.0` przy Azure PostgreSQL.
- Puste `POSTGRES_PASSWORD` w `.env.example` — compose padnie przy starcie, jeśli ktoś go nie uzupełni (głośno, ale warto sprawdzać w `smoke.sh`).

## Odporność i drobne błędy
- Brak listy w body PUT konkursu (`tasks`/`purchases`/`proofs` = null) → 500 zamiast 400.
- Ten sam Id dziecka dwa razy w PUT dodaje encję podwójnie.
- Dwa równoczesne pierwsze zapisy wygranej → 500 (unikalny indeks).
- Zgłoszenie bez daty zapisuje 0001-01-01.
- Sklep nazwany dosłownie „Dowolny sklep” tworzy osobną grupę.
- Kopiowanie konkursu pole-po-polu — nowe pola w `Contest` trzeba dopisać do duplikowania.
- Osierocone pliki zdjęć przy równoczesnym uploadzie i usuwaniu; częściowy plik przy przerwanym zapisie.
- Istniejący publiczny kontener Azure nie jest wykrywany.
- `smoke.sh`: `.env` zostaje przy wyjściu z powodu zajętego portu; `APP_PORT` z `.env` nadpisuje `SMOKE_PORT`; brak sprawdzenia ciasteczka Secure i trwałości kluczy Data Protection.

## Frontend / dostępność
- Etykiety przycisków w `EditableList` nie mówią, której listy dotyczą; klucze po indeksie.
- Formularz edycji ignoruje odświeżenie danych w tle.
- `mutateAsync` w onClick bez `catch` na stronie szczegółów; odhaczanie blokuje całą sekcję.
- Zakładki bez `aria-controls`.

## Luki w testach
- Testy DST/granicy 22:00 UTC latem; rozstrzyganie remisu sortowania przypomnień; wiele przypomnień na konkurs.
- Walidacja konkursu (limity, nagroda, PUT 400), round-trip zakupów/dowodów, sortowanie archiwum.
- Toggle 404 dla zakupów/dowodów; klucze błędów w testach 400.
- Usunięcie cudzego zgłoszenia nie rusza cudzych plików; awaria storage przy DELETE → 204; body > 11 MB.
- Komunikat 401 przy logowaniu, przekierowanie `RequireAuth`, zaproszenia/schowek na stronie „Więcej”.

## Odłożone w rundzie „redesign i AI”
- Zakładki szczegółów bez `aria-controls` i bez nawigacji strzałkami (wzorzec tablist); menu „⋮” na karcie i menu statusu bez nawigacji strzałkami.
- Przewijanie aktywnej zakładki do widoku używa `scrollIntoView` (na starcie może przesunąć stronę, gdy zakładki są poniżej ekranu).
- Miniatury zdjęć nadal są pełnymi plikami (do 10 MB) — małe podglądy po stronie serwera.
- Zrzuty ekranu przy 375 i 1280 px zrobione ręcznie z wbudowanej przeglądarki; brak automatycznych testów wizualnych/regresji układu.
- Kafelek „Dziś / na dziś” liczy tylko przypomnienia o terminie ≤ dziś — przy samych przyszłych alertach pokazuje 0 (świadomie, jak w MVP).
- Odczyt AI (Gemini) sprawdzony tylko na atrapie; w przeglądarce bez klucza przyciski są ukryte, przepływ z prawdziwym kluczem nie był przeklikany.
- Karta „Czekam na wyniki” bez przycisków akcji ma pusty pasek z samym „⋮”.

## Po końcowym przeglądzie rundy „redesign i AI” (2026-11-13)
- Przełączenie zakładki w szczegółach zamyka niedokończony formularz zgłoszenia (traci wpisane dane i zdjęcie z odczytu AI czekające na wysłanie).
- Pigułka „Archiwum” na liście konkursów nie ma licznika.
- Brak UI do zmiany podpisu istniejącego zdjęcia (endpoint `PATCH /api/photos/{id}` jest).
- Szacunek tokenów dla PDF z kompresowanymi strumieniami obiektów (PDF 1.5+) może być zaniżony — przed włączeniem AI przetestować kilka dużych regulaminów z prawdziwym kluczem.
- Przed włączeniem AI: sprawdzić aktualne warunki Gemini API (plan darmowy vs płatny, EOG) i potwierdzić model (`gemini-3.5-flash-lite`) oraz limity 15 RPM / 250 tys. TPM.

## Po rundzie „nagrody, administrator, podpisy” (2026-11-14)
- Brak listy `tasks`/`purchases`/`proofs` w body zapisu konkursu → 500 zamiast 400 (dla `prizes` już 400).
- Rola administratora nie jest odbierana po zmianie `ADMIN_USERNAME` (może powstać drugi administrator); rola trzymana w ciasteczku do ponownego logowania.
- `Admin:UserName` nie jest sprawdzany regułami nicku; zgadywalny nick admina pozwala komuś wywołać tymczasową blokadę konta.
- Kwoty powyżej limitu `numeric(10,2)` → 500; nazwy nagród z AI > 200 znaków trzeba skrócić ręcznie.
- Równoczesny start dwóch instancji może jednorazowo wywrócić zakładanie administratora (samo się naprawia po restarcie).
