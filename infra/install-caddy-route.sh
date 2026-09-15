#!/usr/bin/env sh
set -eu

CONFIG=/etc/caddy/Caddyfile
FRAGMENT=/home/ubuntu/Caddyfile.memocycle
BACKUP="/etc/caddy/Caddyfile.before-memocycle.$(date +%Y%m%d%H%M%S)"

sudo cp "$CONFIG" "$BACKUP"

if ! sudo grep -Fq '# BEGIN MEMOCYCLE' "$CONFIG"; then
  cat "$FRAGMENT" | sudo tee -a "$CONFIG" >/dev/null
fi

sudo caddy fmt --overwrite "$CONFIG"
sudo caddy validate --config "$CONFIG"
sudo systemctl reload caddy

curl --fail --silent --show-error --retry 8 --retry-delay 2 \
  https://memocycle.135-125-100-75.sslip.io/v1/health
printf '\n'
sudo systemctl is-active caddy
sudo docker inspect -f '{{.Name}} {{.State.Health.Status}}' \
  equaz-db equaz-backend equaz-frontend memocycle-postgres memocycle-api
