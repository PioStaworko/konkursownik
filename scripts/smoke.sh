#!/usr/bin/env bash
# Smoke test: build + run the compose stack, check health, register, SPA root; always tears down.
set -euo pipefail
cd "$(dirname "$0")/.."

CREATED_ENV=0
if [ ! -f .env ]; then
  cp .env.example .env
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

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"smoke@example.com\",\"password\":\"smoke-password-1\",\"inviteCode\":\"$BOOTSTRAP_CODE\"}")
[ "$code" = "200" ] || { echo "FAIL: register returned $code"; docker compose -p konkursownik-smoke logs app; exit 1; }
echo "OK register"

curl -s "$BASE/" | grep -q '<div id="root">' || { echo "FAIL: SPA root"; exit 1; }
echo "OK spa"

echo "SMOKE PASSED"
