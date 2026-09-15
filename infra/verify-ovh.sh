#!/usr/bin/env bash
set -euo pipefail
cd /home/ubuntu/Memocycle

echo MEMOCYCLE_COMPOSE
docker compose -p memocycle --env-file .env -f infra/docker-compose.ovh.yml ps

echo MEMOCYCLE_MOUNTS
docker inspect --format '{{.Name}}|{{range .Mounts}}{{.Name}}{{end}}' \
  memocycle-postgres memocycle-api

echo MEMOCYCLE_NETWORKS
docker inspect --format '{{.Name}}|{{json .NetworkSettings.Networks}}' \
  memocycle-postgres memocycle-api

echo MEMOCYCLE_DATABASES
docker exec memocycle-postgres psql -U memocycle -d memocycle -Atc \
  "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"

echo MEMOCYCLE_TABLE_COUNT
docker exec memocycle-postgres psql -U memocycle -d memocycle -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

echo SECRET_FILE_PERMISSIONS
stat -c '%a|%U|%G|%n' /home/ubuntu/Memocycle/.env

echo API_HEALTH
curl --fail --silent --show-error http://127.0.0.1:8092/v1/health
echo

echo EQUAZ_STATUS
docker ps --filter name=equaz- --format '{{.Names}}|{{.Status}}'

echo DISK
df -h / | tail -1
