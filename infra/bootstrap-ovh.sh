#!/usr/bin/env bash
set -euo pipefail

EXPECTED_DIR="/home/ubuntu/Memocycle"
if [[ "$(pwd)" != "$EXPECTED_DIR" ]]; then
  echo "Refusing to run outside $EXPECTED_DIR" >&2
  exit 1
fi
if grep -qi "equaz" infra/docker-compose.ovh.yml; then
  echo "Refusing a MémoCycle compose file that references Equaz" >&2
  exit 1
fi

equaz_before="$(docker inspect --format '{{.Id}}' equaz-db equaz-backend equaz-frontend | sha256sum | cut -d' ' -f1)"

if [[ ! -f .env ]]; then
  umask 077
  postgres_password="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -hex 48)"
  cat > .env <<EOF
POSTGRES_USER=memocycle
POSTGRES_PASSWORD=$postgres_password
POSTGRES_DB=memocycle
JWT_SECRET=$jwt_secret
GOOGLE_ANDROID_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_WEB_CLIENT_ID=
APPLE_CLIENT_ID=app.memocycle.mobile
PUBLIC_ORIGIN=https://memocycle.app
EOF
fi
chmod 600 .env

compose=(docker compose -p memocycle --env-file .env -f infra/docker-compose.ovh.yml)
"${compose[@]}" build api
"${compose[@]}" up -d postgres --wait
"${compose[@]}" run --rm --no-deps api \
  node node_modules/prisma/build/index.js migrate deploy \
  --schema apps/api/prisma/schema.prisma
"${compose[@]}" up -d api --wait

equaz_after="$(docker inspect --format '{{.Id}}' equaz-db equaz-backend equaz-frontend | sha256sum | cut -d' ' -f1)"
if [[ "$equaz_before" != "$equaz_after" ]]; then
  echo "Equaz container identity changed unexpectedly" >&2
  exit 1
fi

docker exec memocycle-postgres psql -U memocycle -d memocycle -Atc \
  "SELECT current_database() || '|' || current_user;"
curl --fail --silent --show-error http://127.0.0.1:8092/v1/health
echo
"${compose[@]}" ps
