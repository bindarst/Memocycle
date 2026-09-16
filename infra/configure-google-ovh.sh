#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "usage: $0 GOOGLE_ANDROID_CLIENT_ID GOOGLE_WEB_CLIENT_ID" >&2
  exit 2
fi

ROOT=/home/ubuntu/Memocycle
ENV_FILE="$ROOT/.env"
ANDROID_ID=$1
WEB_ID=$2

case "$ANDROID_ID:$WEB_ID" in
  *[!A-Za-z0-9._:-]*)
    echo "invalid OAuth client ID" >&2
    exit 2
    ;;
esac

update_value() {
  key=$1
  value=$2
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

cp "$ENV_FILE" "$ENV_FILE.before-google"
update_value GOOGLE_ANDROID_CLIENT_ID "$ANDROID_ID"
update_value GOOGLE_WEB_CLIENT_ID "$WEB_ID"
chmod 600 "$ENV_FILE"

cd "$ROOT"
docker compose -p memocycle --env-file .env -f infra/docker-compose.ovh.yml up -d \
  --no-deps --force-recreate api

attempt=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' memocycle-api)" = healthy ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 15 ]; then
    docker inspect -f '{{.Name}} {{.State.Status}} {{.State.Health.Status}}' memocycle-api
    exit 1
  fi
  sleep 2
done

docker inspect -f '{{.Name}} {{.State.Health.Status}}' memocycle-api
configured=$(docker exec memocycle-api sh -c \
  'test -n "$GOOGLE_ANDROID_CLIENT_ID" && test -n "$GOOGLE_WEB_CLIENT_ID" && echo yes')
test "$configured" = yes
curl --fail --silent --show-error http://127.0.0.1:8092/v1/health
printf '\n'
