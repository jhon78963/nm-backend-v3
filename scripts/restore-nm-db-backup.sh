#!/usr/bin/env bash
# =============================================================================
# restore-nm-db-backup.sh — Restaura backup Laravel (nm_db) y re-sincroniza nm_services
#
# Uso:
#   ./scripts/restore-nm-db-backup.sh
#   ./scripts/restore-nm-db-backup.sh /ruta/al/backup.backup
#
# Requiere: stack Docker con postgres (docker-compose.full.yml o docker-compose.yml)
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_BACKUP="$ROOT/../nm-backup/nm_db_restore_03_09_2026.backup"
BACKUP_FILE="${1:-$DEFAULT_BACKUP}"
COMPOSE_FILE="$ROOT/docker-compose.full.yml"
FALLBACK_COMPOSE_FILE="$ROOT/docker-compose.yml"

PGUSER="${POSTGRES_USER:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD:-password}"
LARAVEL_DB="${LARAVEL_SOURCE_DB:-nm_db}"
SERVICES_DB="${POSTGRES_DB:-nm_services}"

export PGPASSWORD

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[restore]${NC} $*"; }
warn() { echo -e "${YELLOW}[restore]${NC} $*"; }
err()  { echo -e "${RED}[restore]${NC} $*" >&2; }

if [ ! -f "$BACKUP_FILE" ]; then
  err "No se encontró el backup: $BACKUP_FILE"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
else
  DC="docker-compose"
fi

if [ -f "$COMPOSE_FILE" ]; then
  COMPOSE_ARGS=(-f "$COMPOSE_FILE")
elif [ -f "$FALLBACK_COMPOSE_FILE" ]; then
  COMPOSE_ARGS=(-f "$FALLBACK_COMPOSE_FILE")
else
  err "No se encontró docker-compose.full.yml ni docker-compose.yml"
  exit 1
fi

POSTGRES_SERVICE="postgres"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-nm_postgres}"

log "Backup: $BACKUP_FILE"
log "Base Laravel destino: $LARAVEL_DB"
log "Base Prisma destino: $SERVICES_DB"

$DC "${COMPOSE_ARGS[@]}" up -d "$POSTGRES_SERVICE"

log "Esperando PostgreSQL..."
RETRIES=0
until $DC "${COMPOSE_ARGS[@]}" exec -T "$POSTGRES_SERVICE" \
  pg_isready -U "$PGUSER" >/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge 30 ]; then
    err "PostgreSQL no respondió a tiempo."
    exit 1
  fi
  sleep 2
done

CONTAINER_ID="$($DC "${COMPOSE_ARGS[@]}" ps -q "$POSTGRES_SERVICE")"
if [ -z "$CONTAINER_ID" ]; then
  err "No se pudo obtener el contenedor de PostgreSQL."
  exit 1
fi

REMOTE_BACKUP="/tmp/nm_db_restore.backup"
log "Copiando backup al contenedor..."
docker cp "$BACKUP_FILE" "${CONTAINER_ID}:${REMOTE_BACKUP}"

log "Recreando bases ${LARAVEL_DB} y ${SERVICES_DB}..."
$DC "${COMPOSE_ARGS[@]}" exec -T "$POSTGRES_SERVICE" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname IN ('${LARAVEL_DB}', '${SERVICES_DB}')
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS "${LARAVEL_DB}";
CREATE DATABASE "${LARAVEL_DB}";

DROP DATABASE IF EXISTS "${SERVICES_DB}";
CREATE DATABASE "${SERVICES_DB}";
SQL

log "Restaurando backup en ${LARAVEL_DB}..."
if ! $DC "${COMPOSE_ARGS[@]}" exec -T "$POSTGRES_SERVICE" \
  pg_restore -U "$PGUSER" -d "$LARAVEL_DB" --no-owner --no-acl "$REMOTE_BACKUP"; then
  warn "pg_restore terminó con advertencias (habitual en dumps parciales)."
fi

$DC "${COMPOSE_ARGS[@]}" exec -T "$POSTGRES_SERVICE" rm -f "$REMOTE_BACKUP"

log "Aplicando migraciones Prisma + ETL (${LARAVEL_DB} → ${SERVICES_DB})..."
SEED_DEV_ADMIN=false RUN_LARAVEL_ETL=true \
  $DC "${COMPOSE_ARGS[@]}" run --rm \
  -e SEED_DEV_ADMIN=false \
  -e RUN_LARAVEL_ETL=true \
  -v "$ROOT/scripts/docker-prisma-migrate.sh:/app/scripts/docker-prisma-migrate.sh:ro" \
  -v "$ROOT/libs/database/prisma/seed.ts:/app/libs/database/prisma/seed.ts:ro" \
  migrate

log "✅ Restauración completada."
echo ""
echo "Usa las mismas credenciales del sistema Laravel/legacy."
echo "Panel admin: http://localhost:4200"
echo ""
echo "Si necesitas un admin temporal de desarrollo:"
echo "  npm run db:seed:dev-admin"
