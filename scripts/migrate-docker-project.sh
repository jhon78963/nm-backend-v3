#!/usr/bin/env bash
# =============================================================================
# migrate-docker-project.sh — Unifica contenedores bajo el proyecto nm-backend-v3
#
# Migra datos desde volúmenes del proyecto antiguo (nm-nestjs-migration)
# a volúmenes con nombre fijo, luego levanta todo con un solo proyecto Compose.
#
# Uso: ./scripts/migrate-docker-project.sh
# =============================================================================
set -euo pipefail

ROOT="$(dirname "$(realpath "$0")")/.."
COMPOSE_FILE="$ROOT/docker-compose.full.yml"
PROJECT="nm-backend-v3"
OLD_PROJECT="nm-nestjs-migration"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[migrate]${NC} $*"; }
warn() { echo -e "${YELLOW}[migrate]${NC} $*"; }
err()  { echo -e "${RED}[migrate]${NC} $*" >&2; }

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose -p ${PROJECT}"
  DC_OLD="docker-compose -p ${OLD_PROJECT}"
else
  DC="docker compose -p ${PROJECT}"
  DC_OLD="docker compose -p ${OLD_PROJECT}"
fi

copy_volume() {
  local from="$1"
  local to="$2"
  if ! docker volume inspect "$from" >/dev/null 2>&1; then
    warn "Volumen origen '$from' no existe — omitiendo."
    return 0
  fi
  if docker volume inspect "$to" >/dev/null 2>&1; then
    local from_size to_size
    from_size=$(docker run --rm -v "${from}:/v" alpine sh -c "du -sb /v 2>/dev/null | cut -f1" || echo 0)
    to_size=$(docker run --rm -v "${to}:/v" alpine sh -c "du -sb /v 2>/dev/null | cut -f1" || echo 0)
    if [ "$to_size" -ge "$from_size" ] && [ "$from_size" -gt 0 ]; then
      log "Volumen '$to' ya tiene datos — omitiendo copia."
      return 0
    fi
  else
    docker volume create "$to" >/dev/null
  fi
  log "Copiando $from → $to ..."
  docker run --rm \
    -v "${from}:/from:ro" \
    -v "${to}:/to" \
    alpine sh -c "cp -a /from/. /to/"
}

log "Paso 1/4: Deteniendo proyectos antiguos..."
$DC_OLD -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || warn "Proyecto $OLD_PROJECT no estaba activo."
$DC -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

log "Paso 2/4: Migrando volúmenes de datos..."
copy_volume "${OLD_PROJECT}_nm_postgres_data" "nm_postgres_data"
copy_volume "${OLD_PROJECT}_invoicing_vendor" "nm_invoicing_vendor"
copy_volume "nm-backend-v3_storage_uploads" "nm_storage_uploads"

log "Paso 3/4: Levantando stack unificado ($PROJECT)..."
$DC -f "$COMPOSE_FILE" up -d postgres redis

log "Esperando PostgreSQL..."
for i in $(seq 1 30); do
  if $DC -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

$DC -f "$COMPOSE_FILE" run --rm migrate
$DC -f "$COMPOSE_FILE" up -d \
  gateway auth-service catalog-service inventory-service \
  pos-service finance-service hr-service report-service \
  storage-service ai-engine invoicing-service

log "Paso 4/4: Verificando contenedores..."
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Label \"com.docker.compose.project\"}}" \
  | grep -E "nm_|NAMES"
echo ""
log "✅ Migración completa. Todos los servicios están bajo el proyecto '${PROJECT}'."
warn "Puedes eliminar volúmenes huérfanos del proyecto antiguo cuando confirmes que todo funciona:"
warn "  docker volume rm ${OLD_PROJECT}_nm_postgres_data ${OLD_PROJECT}_invoicing_vendor nm-backend-v3_nm_postgres_data nm-backend-v3_storage_uploads"
