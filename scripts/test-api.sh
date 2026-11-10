#!/usr/bin/env bash
# Tests de l'API, contre le site construit puis démarré deux fois :
#   - port 3100, sans envoi de mails, base « blocklucky_test »        (test-api/api.test.mjs)
#   - port 3101, avec un faux serveur mail, base « blocklucky_test_mail » (test-api/confirmation.test.mjs)
# Les deux bases sont EFFACÉES et recréées.
#   npm run test:api          (SKIP_BUILD=1 pour réutiliser la dernière construction)
# Prérequis : MySQL démarré ; par défaut « root » sans mot de passe, sinon DB_USER / DB_PASSWORD.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${API_TEST_PORT:-3100}"
MAIL_PORT="${API_TEST_MAIL_PORT:-3101}"
SMTP_PORT="${MAIL_TEST_SMTP_PORT:-2526}"
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-3306}" DB_USER="${DB_USER:-root}" DB_PASSWORD="${DB_PASSWORD:-}"
export ADMIN_EMAIL=admin@test.local ADMIN_PASSWORD=test-admin-1234
mkdir -p cache

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
[ -n "$DB_PASSWORD" ] && MYSQL+=(-p"$DB_PASSWORD")
if ! "${MYSQL[@]}" -e "DROP DATABASE IF EXISTS blocklucky_test; CREATE DATABASE blocklucky_test;
                       DROP DATABASE IF EXISTS blocklucky_test_mail; CREATE DATABASE blocklucky_test_mail"; then
  echo "❌ Connexion à MySQL impossible. MySQL est-il démarré ?"
  exit 1
fi

if [ "${SKIP_BUILD:-}" != 1 ]; then
  echo "Construction du site (journal : cache/test-api-build.log)…"
  npx next build > cache/test-api-build.log 2>&1 || { tail -30 cache/test-api-build.log; exit 1; }
fi

# Sans mails (une valeur vide prime sur celle d'un éventuel .env)
DB_NAME=blocklucky_test SMTP_HOST="" npx next start -p "$PORT" > cache/test-api-site.log 2>&1 &
SITE_PID=$!
# Avec mails : le faux serveur SMTP est démarré par le test lui-même
DB_NAME=blocklucky_test_mail SMTP_HOST=127.0.0.1 SMTP_PORT="$SMTP_PORT" SMTP_USER="" MAIL_FROM=noreply@test.local SITE_URL="http://localhost:$MAIL_PORT" \
  npx next start -p "$MAIL_PORT" > cache/test-api-site-mail.log 2>&1 &
MAIL_PID=$!
trap 'kill "$SITE_PID" "$MAIL_PID" 2> /dev/null || true' EXIT
for url in "http://localhost:$PORT" "http://localhost:$MAIL_PORT"; do
  for _ in $(seq 1 60); do curl -s -o /dev/null "$url" && break; sleep 1; done
done

BASE_URL="http://localhost:$PORT" MAIL_BASE_URL="http://localhost:$MAIL_PORT" MAIL_TEST_SMTP_PORT="$SMTP_PORT" \
  node --test "test-api/*.test.mjs"
