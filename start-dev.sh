#!/usr/bin/env bash
# =============================================================================
# start-dev.sh — nm-services: Entorno de desarrollo local
#
# Levanta PostgreSQL + Redis en Docker, espera a que la BD esté lista,
# ejecuta la migración Prisma y muestra cómo arrancar los microservicios.
#
# Uso:
#   ./start-dev.sh           → infra + migración (servicios corren localmente)
#   ./start-dev.sh --full    → stack Docker completo (via docker-compose.full.yml)
#   ./start-dev.sh --down    → detiene contenedores de infraestructura
#   ./start-dev.sh --reset   → borra volumen Postgres y reinicia desde cero
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_INFRA="$ROOT/docker-compose.yml"
COMPOSE_FULL="$ROOT/docker-compose.full.yml"
ENV_FILE="$ROOT/.env"
SCHEMA="$ROOT/libs/database/prisma/schema.prisma"

# ── Colores ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[nm]${NC} $*"; }
warn() { echo -e "${YELLOW}[nm]${NC} $*"; }
err()  { echo -e "${RED}[nm]${NC} $*" >&2; }
sep()  { echo -e "${BLUE}────────────────────────────────────────────────${NC}"; }
step() { echo -e "${BOLD}${CYAN}▶ $*${NC}"; }

# ── Detectar docker compose ───────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { err "Docker no está instalado."; exit 1; }
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  err "docker compose / docker-compose no disponible."; exit 1
fi

# ── Flags ─────────────────────────────────────────────────────────────────────
MODE="dev"   # dev | full | down | reset
for arg in "$@"; do
  case $arg in
    --full)  MODE="full"  ;;
    --down)  MODE="down"  ;;
    --reset) MODE="reset" ;;
    --help)
      echo "Uso: $0 [--full] [--down] [--reset]"
      echo "  (sin flags)  Levanta PostgreSQL+Redis en Docker; servicios corren con npm"
      echo "  --full       Stack Docker completo (docker-compose.full.yml)"
      echo "  --down       Detiene contenedores de infraestructura"
      echo "  --reset      Borra volumen Postgres y reinicia desde cero"
      exit 0 ;;
  esac
done

sep
echo -e "${BOLD}  nm-services — Dev Environment${NC}"
sep

# ── Modo: bajar stack ─────────────────────────────────────────────────────────
if [ "$MODE" = "down" ]; then
  step "Deteniendo contenedores de infraestructura..."
  $DC -f "$COMPOSE_INFRA" down --remove-orphans
  log "✅ Contenedores detenidos. Datos de BD conservados."
  log "   Para borrar datos: docker volume rm nm_postgres_data"
  exit 0
fi

# ── Modo: reset completo ──────────────────────────────────────────────────────
if [ "$MODE" = "reset" ]; then
  warn "⚠️  Esto eliminará TODOS los datos de la base de datos."
  read -r -p "   ¿Confirmar reset? [s/N] " confirm
  [[ "$confirm" =~ ^[sS]$ ]] || { log "Reset cancelado."; exit 0; }
  step "Bajando contenedores y borrando volumen..."
  $DC -f "$COMPOSE_INFRA" down --remove-orphans -v 2>/dev/null || true
  docker volume rm nm_postgres_data 2>/dev/null || true
  log "✅ Volumen eliminado. Reiniciando..."
  MODE="dev"
fi

# ── Modo: stack Docker completo ───────────────────────────────────────────────
if [ "$MODE" = "full" ]; then
  step "Delegando a scripts/start-docker-env.sh --build..."
  exec bash "$ROOT/scripts/start-docker-env.sh" --build "$@"
fi

# =============================================================================
# MODO DEFAULT: Infra local (Postgres + Redis en Docker) + servicios con npm
# =============================================================================

# ── 1. Verificar/crear .env ───────────────────────────────────────────────────
sep
step "Paso 1/3 — Verificando configuración de entorno"

if [ ! -f "$ENV_FILE" ]; then
  cp "$ROOT/.env.example" "$ENV_FILE"
  warn ".env creado desde .env.example"
  warn "   ⚠️  Edita .env antes de producción:"
  warn "      JWT_SECRET y JWT_REFRESH_SECRET → mínimo 64 caracteres aleatorios"
  echo ""
fi

# Cargar variables de entorno (silencioso)
set -o allexport
# shellcheck disable=SC1090
source "$ENV_FILE"
set +o allexport

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-nm_services}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

log "✅ Variables de entorno cargadas."

# ── 2. Levantar PostgreSQL + Redis ────────────────────────────────────────────
sep
step "Paso 2/3 — Levantando PostgreSQL y Redis"

$DC -f "$COMPOSE_INFRA" up -d postgres redis

# Esperar a que PostgreSQL esté listo (hasta 60 s)
log "Esperando a que PostgreSQL esté listo en el puerto ${POSTGRES_PORT}..."
RETRIES=0
MAX_RETRIES=30
until $DC -f "$COMPOSE_INFRA" exec -T postgres \
    pg_isready -U "$POSTGRES_USER" >/dev/null 2>&1; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    err "PostgreSQL no respondió en 60 s."
    err "Revisa los logs: $DC -f $COMPOSE_INFRA logs postgres"
    exit 1
  fi
  printf "."
  sleep 2
done
echo ""
log "✅ PostgreSQL listo."
log "✅ Redis listo."

# ── 3. Migraciones Prisma ─────────────────────────────────────────────────────
sep
step "Paso 3/3 — Ejecutando migraciones Prisma"

if [ ! -f "$SCHEMA" ]; then
  err "Schema no encontrado en: $SCHEMA"
  exit 1
fi

# Verificar si ya existen migraciones aplicadas
MIGRATIONS_DIR="$ROOT/libs/database/prisma/migrations"

if [ -d "$MIGRATIONS_DIR" ] && [ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  log "Migraciones existentes detectadas. Aplicando con migrate dev..."
  npx prisma migrate dev \
    --schema="$SCHEMA" \
    --skip-seed
else
  log "Primera ejecución — creando migración inicial 'init'..."
  npx prisma migrate dev \
    --schema="$SCHEMA" \
    --name init \
    --skip-seed
fi

log "✅ Migraciones aplicadas correctamente."

# ── Resumen final ─────────────────────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}${BOLD}  ✅ Infraestructura lista (PostgreSQL + Redis)${NC}"
echo ""
echo -e "${YELLOW}${BOLD}  ⚠️  Los microservicios NestJS NO están corriendo todavía.${NC}"
echo -e "${YELLOW}     ./start-dev.sh solo levanta la base de datos y Redis.${NC}"
echo ""
echo -e "${CYAN}  OPCIÓN A — Todo con Docker (recomendado):${NC}"
echo -e "  ┌─────────────────────────────────────────────────────────────────┐"
echo -e "  │  ./start-dev.sh --full                                          │"
echo -e "  │  → Levanta los 8 microservicios + gateway en contenedores       │"
echo -e "  │  → Swagger: http://localhost:3000/api/docs                      │"
echo -e "  └─────────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  OPCIÓN B — Servicios locales con npm (terminales separadas):${NC}"
echo -e "  ┌─────────────────────────────────────────────────────────────────┐"
echo -e "  │  npm run start:dev:auth      →  http://localhost:3001/api/docs  │"
echo -e "  │  npm run start:dev:catalog   →  http://localhost:3002/api/docs  │"
echo -e "  │  npm run start:dev:gateway   →  http://localhost:3000/api/docs  │"
echo -e "  │                                                                 │"
echo -e "  │  (ver package.json para todos los start:dev:* disponibles)      │"
echo -e "  └─────────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  INFRAESTRUCTURA ACTIVA${NC}"
echo -e "  ┌─────────────────────────────────────────────────────┐"
echo -e "  │  PostgreSQL  →  localhost:${POSTGRES_PORT}  (DB: ${POSTGRES_DB})  │"
echo -e "  │  Redis       →  localhost:6379                      │"
echo -e "  └─────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  HERRAMIENTAS${NC}"
echo -e "  # Prisma Studio (explorador visual de BD):"
echo -e "  npx prisma studio --schema=libs/database/prisma/schema.prisma"
echo ""
echo -e "  # PgAdmin (opcional — GUI web):"
echo -e "  $DC -f $COMPOSE_INFRA --profile tools up -d pgadmin"
echo -e "  → http://localhost:5050  (admin@nm.local / admin)"
echo ""
echo -e "  # Detener infraestructura:"
echo -e "  ./start-dev.sh --down"
echo ""
sep
