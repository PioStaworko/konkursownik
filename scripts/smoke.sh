#!/usr/bin/env bash
# Smoke test: build + run the compose stack, check health, admin login, SPA root; always tears down.
set -euo pipefail
cd "$(dirname "$0")/.."

CREATED_ENV=0
if [ ! -f .env ]; then
  rand() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
  printf 'POSTGRES_PASSWORD=%s\nADMIN_USERNAME=smokeadmin\nADMIN_PASSWORD=%s\n' "$(rand 24)" "$(rand 12)" > .env
  CREATED_ENV=1
fi

# Isolated project: never touches a live selfhost stack's containers/volumes.
export COMPOSE_PROJECT_NAME=konkursownik-smoke
export APP_PORT="${SMOKE_PORT:-8080}"

if curl -s -o /dev/null --max-time 2 "http://localhost:$APP_PORT/"; then
  echo "FAIL: port $APP_PORT is already in use; free it or run with SMOKE_PORT=<other port>"
  exit 1
fi

cleanup() {
  docker compose -p konkursownik-smoke down -v || true
  if [ "$CREATED_ENV" = 1 ]; then rm -f .env; fi
}
trap cleanup EXIT

set -a; . ./.env; set +a
# A user-provided .env may lack the admin account; the test needs one (random, never printed).
admin_pw="${ADMIN_PASSWORD:-}"
if [ -z "${ADMIN_USERNAME:-}" ] || [ "${#admin_pw}" -lt 8 ]; then
  ADMIN_USERNAME="smokeadmin"
  ADMIN_PASSWORD="smoke$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  export ADMIN_USERNAME ADMIN_PASSWORD
fi
BASE="http://localhost:$APP_PORT"

docker compose -p konkursownik-smoke up -d --build

echo "Waiting for /api/health ..."
ok=0
for i in $(seq 1 60); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/health" || true)" = "200" ]; then ok=1; break; fi
  sleep 2
done
[ "$ok" = 1 ] || { echo "FAIL: health"; docker compose -p konkursownik-smoke logs app; exit 1; }
echo "OK health"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"userName\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")
[ "$code" = "200" ] || { echo "FAIL: admin login returned $code"; docker compose -p konkursownik-smoke logs app; exit 1; }
echo "OK admin login"

curl -s "$BASE/" | grep -q '<div id="root">' || { echo "FAIL: SPA root"; exit 1; }
echo "OK spa"

echo "SMOKE PASSED"
