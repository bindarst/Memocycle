#!/usr/bin/env bash
set -euo pipefail
: "${BACKUP_DIRECTORY:?Set backup destination}" "${AGE_RECIPIENT:?Set age public recipient}" "${COMPOSE_ENV_FILE:?Set production env path}"
umask 077
mkdir -p -- "$BACKUP_DIRECTORY"
target="$BACKUP_DIRECTORY/memocycle-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$(dirname "$0")/docker-compose.production.yml" exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' | age -r "$AGE_RECIPIENT" -o "$target.partial"
mv -- "$target.partial" "$target"
sha256sum "$target" > "$target.sha256"
