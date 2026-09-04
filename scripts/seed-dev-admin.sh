#!/usr/bin/env bash
# Crea o restablece el usuario admin de desarrollo en la BD de Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.full.yml"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

cd "$ROOT"

$DC -f "$COMPOSE_FILE" run --rm --no-deps migrate \
  npx ts-node --project tsconfig.migration.json libs/database/prisma/seed.ts

echo ""
echo "Login admin:"
echo "  usuario:  admin"
echo "  password: Admin123!"
echo "  URL:      http://localhost:4200"
