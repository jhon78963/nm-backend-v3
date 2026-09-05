#!/usr/bin/env bash
# =============================================================================
# restore-nm-db-backup.sh — Restaura backup Laravel (nm_db) y re-sincroniza nm_services
#
# Uso:
#   ./scripts/restore-nm-db-backup.sh
#   ./scripts/restore-nm-db-backup.sh /ruta/al/backup.backup
#
# Compatible con:
#   - nm-backend-v3/docker-compose.full.yml (solo backend)
#   - nm-deploy/docker-compose.yml (stack unificado; reutiliza nm_postgres si ya corre)
#
# Variables opcionales:
#   COMPOSE_FILE=/ruta/docker-compose.yml
#   POSTGRES_CONTAINER=nm_postgres
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ROOT="$ROOT/../nm-deploy"
DEFAULT_BACKUP="$ROOT/../nm-backup/nm_db_restore_04_09_2026.backup"
BACKUP_FILE="${1:-$DEFAULT_BACKUP}"

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

resolve_compose() {
  if [ -n "${COMPOSE_FILE:-}" ] && [ -f "$COMPOSE_FILE" ]; then
    COMPOSE_ARGS=(-f "$COMPOSE_FILE")
    COMPOSE_WORKDIR="$(cd "$(dirname "$COMPOSE_FILE")" && pwd)"
    return
  fi

  if [ -f "$DEPLOY_ROOT/docker-compose.yml" ]; then
    COMPOSE_ARGS=(-f "$DEPLOY_ROOT/docker-compose.yml")
    COMPOSE_WORKDIR="$DEPLOY_ROOT"
    return
  fi

  if [ -f "$ROOT/docker-compose.full.yml" ]; then
    COMPOSE_ARGS=(-f "$ROOT/docker-compose.full.yml")
    COMPOSE_WORKDIR="$ROOT"
    return
  fi

  if [ -f "$ROOT/docker-compose.yml" ]; then
    COMPOSE_ARGS=(-f "$ROOT/docker-compose.yml")
    COMPOSE_WORKDIR="$ROOT"
    return
  fi

  err "No se encontró docker-compose (nm-deploy ni nm-backend-v3)."
  exit 1
}

resolve_compose

POSTGRES_SERVICE="postgres"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-nm_postgres}"

log "Backup: $BACKUP_FILE"
log "Base Laravel destino: $LARAVEL_DB"
log "Base Prisma destino: $SERVICES_DB"
log "Compose: ${COMPOSE_ARGS[*]}"

dc() {
  (cd "$COMPOSE_WORKDIR" && $DC "${COMPOSE_ARGS[@]}" "$@")
}

if docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  log "Reutilizando contenedor existente: $POSTGRES_CONTAINER"
  CONTAINER_ID="$(docker ps -q -f "name=^${POSTGRES_CONTAINER}$")"
else
  log "Levantando PostgreSQL..."
  dc up -d "$POSTGRES_SERVICE"
  CONTAINER_ID="$(dc ps -q "$POSTGRES_SERVICE")"
fi

log "Esperando PostgreSQL..."
RETRIES=0
until docker exec "$POSTGRES_CONTAINER" pg_isready -U "$PGUSER" >/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge 30 ]; then
    err "PostgreSQL no respondió a tiempo."
    exit 1
  fi
  sleep 2
done

if [ -z "$CONTAINER_ID" ]; then
  CONTAINER_ID="$(docker ps -q -f "name=^${POSTGRES_CONTAINER}$")"
fi

if [ -z "$CONTAINER_ID" ]; then
  err "No se pudo obtener el contenedor de PostgreSQL."
  exit 1
fi

REMOTE_BACKUP="/tmp/nm_db_restore.backup"
log "Copiando backup al contenedor..."
docker cp "$BACKUP_FILE" "${CONTAINER_ID}:${REMOTE_BACKUP}"

log "Recreando bases ${LARAVEL_DB} y ${SERVICES_DB}..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
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
if ! docker exec -i "$POSTGRES_CONTAINER" \
  pg_restore -U "$PGUSER" -d "$LARAVEL_DB" --no-owner --no-acl "$REMOTE_BACKUP"; then
  warn "pg_restore terminó con advertencias (habitual en dumps parciales)."
fi

docker exec "$POSTGRES_CONTAINER" rm -f "$REMOTE_BACKUP"

log "Aplicando migraciones Prisma + ETL (${LARAVEL_DB} → ${SERVICES_DB})..."
SEED_DEV_ADMIN=false RUN_LARAVEL_ETL=true \
  dc run --rm \
  -e SEED_DEV_ADMIN=false \
  -e RUN_LARAVEL_ETL=true \
  -v "$ROOT/scripts/docker-prisma-migrate.sh:/app/scripts/docker-prisma-migrate.sh:ro" \
  -v "$ROOT/scripts/seed-document-series.ts:/app/scripts/seed-document-series.ts:ro" \
  -v "$ROOT/libs/database/prisma/seeds/chatbot-seed.ts:/app/libs/database/prisma/seeds/chatbot-seed.ts:ro" \
  -v "$ROOT/libs/database/prisma/seed.ts:/app/libs/database/prisma/seed.ts:ro" \
  migrate

log "✅ Restauración completada."
echo ""
echo "Usa las mismas credenciales del sistema Laravel/legacy."
echo "Siguiente paso (stack completo):"
echo "  cd $DEPLOY_ROOT && docker compose up -d --build"
echo ""
echo "Si necesitas un admin temporal de desarrollo:"
echo "  npm run db:seed:dev-admin"
