# Wdrożenie Konkursownika

Aplikacja to jeden proces ASP.NET Core (API + zbudowany frontend React), baza PostgreSQL i miejsce na zdjęcia (dysk lub Azure Blob Storage). Poniżej dwie drogi: **Azure** (część A) i **własny serwer z Dockerem** (część B).

> Ceny usług Azure, Neon i innych zmieniają się — **sprawdź aktualny cennik** przed utworzeniem zasobów.

## Wymagania na swoim komputerze

- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) (`az`), zalogowany: `az login`
- .NET SDK 10 i Node.js 22+ (do publikacji)
- Docker (tylko dla części B)

---

## Część A: Azure

W komendach zmień wartości w `<...>` na własne. Nazwa Storage Account (3–24 małe litery i cyfry) i nazwa aplikacji web muszą być unikalne globalnie.

Ustaw zmienne (Git Bash / Linux / macOS; w PowerShell użyj `$RG="..."`):

```bash
RG=konkursownik-rg
LOCATION=westeurope
STORAGE=<unikalnanazwastorage>
PLAN=konkursownik-plan
APP=<unikalna-nazwa-aplikacji>
```

### Krok 1. Baza PostgreSQL

Wybierz **jedną** opcję.

**Opcja 1: Neon (darmowy plan, poza Azure).**

1. Załóż konto na <https://neon.tech>, utwórz projekt (region w Europie).
2. Skopiuj dane połączenia i zapisz w formacie Npgsql, np.:
   `Host=ep-xxxx.eu-central-1.aws.neon.tech;Database=neondb;Username=<user>;Password=<hasło>;SSL Mode=Require`
3. Zachowaj go — użyjesz w kroku 4 jako `ConnectionStrings__Default`.

**Opcja 2: Azure Database for PostgreSQL Flexible Server.**

```bash
az group create --name $RG --location $LOCATION

az postgres flexible-server create \
  --resource-group $RG --name <unikalna-nazwa-serwera> --location $LOCATION \
  --admin-user konkursownik --admin-password '<silne-haslo>' \
  --database-name konkursownik \
  --public-access 0.0.0.0
```

`--public-access 0.0.0.0` pozwala usługom Azure łączyć się z bazą. Wybór warstwy (SKU) i jej koszt — sprawdź aktualny cennik. Connection string:
`Host=<unikalna-nazwa-serwera>.postgres.database.azure.com;Database=konkursownik;Username=konkursownik;Password=<silne-haslo>;SSL Mode=Require`

### Krok 2. Grupa zasobów, Storage Account i prywatny kontener `photos`

```bash
az group create --name $RG --location $LOCATION   # jeśli grupa już istnieje, nic się nie psuje

az storage account create \
  --name $STORAGE --resource-group $RG --location $LOCATION \
  --sku Standard_LRS --kind StorageV2 \
  --allow-blob-public-access false --min-tls-version TLS1_2

STORAGE_CONN=$(az storage account show-connection-string \
  --name $STORAGE --resource-group $RG --query connectionString -o tsv)

az storage container create \
  --name photos --connection-string "$STORAGE_CONN" --public-access off
```

Kontener jest **prywatny** — zdjęcia są serwowane tylko przez aplikację (po zalogowaniu).

### Krok 3. App Service (Linux, .NET 10)

```bash
az appservice plan create \
  --name $PLAN --resource-group $RG --location $LOCATION \
  --is-linux --sku B1

az webapp create \
  --name $APP --resource-group $RG --plan $PLAN \
  --runtime "DOTNETCORE:10.0"

az webapp update --name $APP --resource-group $RG --https-only true
```

`B1` to tylko przykład — wybierz plan wg potrzeb i **sprawdź aktualny cennik**. Jeśli runtime `DOTNETCORE:10.0` nie jest dostępny w Twoim regionie, zobacz listę: `az webapp list-runtimes --os linux`.

### Krok 4. Ustawienia aplikacji

```bash
az webapp config appsettings set --name $APP --resource-group $RG --settings \
  "ConnectionStrings__Default=<connection string z kroku 1>" \
  "Storage__Provider=AzureBlob" \
  "Storage__BlobConnectionString=$STORAGE_CONN" \
  "Storage__BlobContainer=photos" \
  "Invites__BootstrapCode=<wymyśl-jednorazowy-kod>" \
  "Database__MigrateOnStartup=true"
```

Uwagi:

- Nie ustawiaj `DataProtection__KeysPath` — na App Service klucze szyfrujące ciasteczka obsługuje platforma.
- Podwójne podkreślenie `__` w nazwie oznacza zagnieżdżenie konfiguracji (`Storage:Provider`).
- Migracje bazy uruchamiają się same przy starcie (`Database__MigrateOnStartup=true`).

### Krok 5. Publikacja aplikacji

Z katalogu głównego repozytorium:

```bash
# 1. Frontend -> backend/Konkursownik.Api/wwwroot
cd frontend
npm ci
npm run build
cd ..

# 2. Publikacja backendu (wwwroot trafia do paczki)
dotnet publish backend/Konkursownik.Api/Konkursownik.Api.csproj -c Release -o publish

# 3. Spakuj i wyślij (w PowerShell: Compress-Archive -Path publish\* -DestinationPath publish.zip)
cd publish && zip -r ../publish.zip . && cd ..
az webapp deploy --name $APP --resource-group $RG --src-path publish.zip --type zip
```

Aplikacja będzie pod `https://<APP>.azurewebsites.net`. Sprawdź: `https://<APP>.azurewebsites.net/api/health` powinno zwrócić `{"status":"ok"}`.

### Krok 6. Pierwsze konto i usunięcie kodu bootstrap

1. Otwórz stronę, wybierz rejestrację i podaj e-mail, hasło (min. 8 znaków) oraz kod z `Invites__BootstrapCode`. Kod bootstrap działa **tylko dopóki w bazie nie ma żadnego użytkownika**.
2. Po zalogowaniu generuj w aplikacji kody zaproszeń dla kolejnych osób.
3. Usuń kod bootstrap:

```bash
az webapp config appsettings delete --name $APP --resource-group $RG --setting-names Invites__BootstrapCode
```

---

## Część B: Własny serwer (Docker + Caddy)

### Krok 1. Uruchomienie

```bash
git clone <adres-repozytorium> konkursownik && cd konkursownik
cp .env.example .env
# edytuj .env: ustaw długie losowe POSTGRES_PASSWORD i własny BOOTSTRAP_CODE
docker compose up -d --build
```

Aplikacja nasłuchuje na porcie 8080 (HTTP). Dane żyją w wolumenach Dockera: `pgdata` (baza), `photos` (zdjęcia), `keys` (klucze Data Protection — dzięki nim restart kontenera nie wylogowuje użytkowników). Pierwsze konto zakładasz jak w części A, krok 6; potem wyczyść `BOOTSTRAP_CODE` w `.env` i wykonaj `docker compose up -d`.

### Krok 2. HTTPS przez Caddy

Zainstaluj [Caddy](https://caddyserver.com/docs/install) na serwerze, skieruj rekord DNS domeny na serwer i otwórz porty 80 i 443. Plik `/etc/caddy/Caddyfile`:

```
konkursy.example.com {
    reverse_proxy localhost:8080
}
```

Przeładuj: `sudo systemctl reload caddy`. Caddy sam pobierze certyfikat Let's Encrypt. Aplikacja ufa nagłówkom `X-Forwarded-For` / `X-Forwarded-Proto`, więc ciasteczka i adresy działają poprawnie za proxy. Zalecane: zablokuj dostęp do portu 8080 z internetu (firewall) albo w `docker-compose.yml` zmień mapowanie na `"127.0.0.1:8080:8080"` — aplikacja ufa nagłówkom od każdego, więc powinna być osiągalna tylko przez proxy.

---

## Kopia zapasowa

**Baza** (wdrożenie Docker):

```bash
docker compose exec -T db pg_dump -U konkursownik -Fc konkursownik > konkursownik-$(date +%F).dump
```

Przywracanie: `docker compose exec -T db pg_restore -U konkursownik -d konkursownik --clean --if-exists < konkursownik-RRRR-MM-DD.dump`

Dla Neon / Azure PostgreSQL użyj `pg_dump` z własnego komputera: `pg_dump "host=... dbname=... user=... sslmode=require" -Fc > backup.dump` (Azure Flexible Server ma też własne automatyczne kopie — sprawdź ich zakres w portalu).

**Zdjęcia:**

- Docker: `docker run --rm -v <katalog-projektu>_photos:/data -v "$PWD":/backup alpine tar czf /backup/photos-$(date +%F).tgz -C /data .` (dokładną nazwę wolumenu zobaczysz w `docker volume ls`).
- Azure Blob: `az storage blob download-batch --destination ./photos-backup --source photos --connection-string "$STORAGE_CONN"` albo włącz soft delete / replikację na koncie Storage.

---

## Rozwiązywanie problemów

- **Strona zwraca 500 / aplikacja nie startuje:** Azure: `az webapp log tail --name $APP --resource-group $RG`. Docker: `docker compose logs app`.
- **Błąd połączenia z bazą:** sprawdź `ConnectionStrings__Default` (hasło, `SSL Mode=Require` dla Neon/Azure) oraz regułę firewalla serwera PostgreSQL.
- **Rejestracja zwraca `invalid_invite`:** kod bootstrap działa tylko gdy nie ma jeszcze użytkowników i musi zgadzać się z ustawieniem (wielkość liter nie ma znaczenia). Kolejne konta wymagają kodu zaproszenia z aplikacji.
- **Zdjęcia nie działają na Azure:** sprawdź `Storage__Provider=AzureBlob`, poprawność `Storage__BlobConnectionString` i istnienie kontenera `photos`.
- **Wylogowuje po każdym restarcie (Docker):** upewnij się, że wolumen `keys` jest podpięty i ustawione `DataProtection__KeysPath=/data/keys`.
- **Port 8080 zajęty:** zmień mapowanie w `docker-compose.yml`, np. `"8081:8080"`.
- **Błędne daty „dziś” / sortowanie polskich nazw:** aplikacja wymaga strefy `Europe/Warsaw` i ICU; oficjalny obraz `aspnet` je zawiera — nie ustawiaj `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT`.
