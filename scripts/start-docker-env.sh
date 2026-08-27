#!/usr/bin/env bash
# =============================================================================
# start-docker-env.sh — nm-services: Levanta el stack completo con Docker
# Uso: ./scripts/start-docker-env.sh [--build] [--tools] [--down] [--logs]
# =============================================================================
set -euo pipefail

COMPOSE_FILE="$(dirname "$(realpath "$0")")/../docker-compose.full.yml"
ENV_FILE="$(dirname "$(realpath "$0")")/../.env"

# ── Colores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[nm]${NC} $*"; }
warn() { echo -e "${YELLOW}[nm]${NC} $*"; }
err()  { echo -e "${RED}[nm]${NC} $*" >&2; }
sep()  { echo -e "${BLUE}──────────────────────────────────────────────────${NC}"; }

# Espera con timeout portable (macOS no incluye GNU timeout)
wait_for() {
  local description="$1"
  local max_seconds="$2"
  shift 2
  local retries=0
  local max_retries=$((max_seconds / 2))
  until "$@"; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$max_retries" ]; then
      return 1
    fi
    sleep 2
  done
  return 0
}

# ── Flags ────────────────────────────────────────────────────────────────────
DO_BUILD=false
DO_TOOLS=false
DO_DOWN=false
DO_LOGS=false

for arg in "$@"; do
  case $arg in
    --build) DO_BUILD=true ;;
    --tools) DO_TOOLS=true ;;
    --down)  DO_DOWN=true ;;
    --logs)  DO_LOGS=true ;;
    --help)
      echo "Uso: $0 [--build] [--tools] [--down] [--logs]"
      echo "  --build   Fuerza reconstrucción de imágenes (docker build --no-cache)"
      echo "  --tools   Incluye PgAdmin en el stack"
      echo "  --down    Detiene y elimina todos los contenedores"
      echo "  --logs    Muestra logs en tiempo real después de levantar"
      exit 0 ;;
  esac
done

# ── Validaciones ─────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { err "Docker no está instalado."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || {
  err "docker-compose / docker compose no disponible."; exit 1;
}

# Detectar si usar 'docker-compose' o 'docker compose'
if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker compose"
fi

sep
log "nm-services — Docker Environment Manager"
sep

# ── Bajar el stack si se pide ─────────────────────────────────────────────────
if $DO_DOWN; then
  warn "Deteniendo y eliminando contenedores..."
  $DC -f "$COMPOSE_FILE" down --remove-orphans
  log "Stack detenido. Volumenes preservados (datos de DB intactos)."
  log "Para borrar datos: docker volume rm nm_postgres_data"
  exit 0
fi

# ── Verificar .env ────────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  warn ".env no encontrado. Copiando desde .env.example..."
  cp "$(dirname "$ENV_FILE")/.env.example" "$ENV_FILE"
  warn "⚠️  IMPORTANTE: Edita .env con tus secretos reales antes de producción:"
  warn "   - JWT_SECRET y JWT_REFRESH_SECRET (usa valores aleatorios de 64 chars)"
  warn "   - DATABASE_URL con credenciales reales"
  echo ""
fi

# ── Profiles ─────────────────────────────────────────────────────────────────
PROFILES=""
$DO_TOOLS && PROFILES="--profile tools"

# ── 1. BUILD ──────────────────────────────────────────────────────────────────
sep
log "Paso 1/3: Construyendo imágenes Docker..."

BUILD_FLAGS=""
$DO_BUILD && BUILD_FLAGS="--no-cache"

# Construir capa deps compartida primero (una sola descarga de npm)
log "  → Capa base de dependencias (compartida entre servicios)..."
DOCKER_BUILDKIT=1 docker build --target deps -t nm-nestjs-deps -f "$(dirname "$COMPOSE_FILE")/Dockerfile" "$(dirname "$COMPOSE_FILE")"

# Limitar paralelismo para evitar saturar red/CPU en builds simultáneos
log "  → Compilando microservicios (paralelismo limitado)..."
DOCKER_BUILDKIT=1 COMPOSE_PARALLEL_LIMIT=2 $DC -f "$COMPOSE_FILE" build $BUILD_FLAGS

log "✅ Imágenes construidas."

# ── 2. LEVANTAR INFRAESTRUCTURA ───────────────────────────────────────────────
sep
log "Paso 2/3: Levantando PostgreSQL y Redis..."

$DC -f "$COMPOSE_FILE" $PROFILES up -d postgres redis

log "Esperando a que PostgreSQL esté listo..."
if ! wait_for "PostgreSQL" 60 $DC -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-postgres}"; then
  err "PostgreSQL no arrancó en 60s. Revisa: $DC -f $COMPOSE_FILE logs postgres"
  exit 1
fi

log "✅ PostgreSQL listo."

# ── 3. MIGRACIONES ────────────────────────────────────────────────────────────
sep
log "Paso 3/3: Ejecutando migraciones Prisma..."

MIGRATE_LOG="$(mktemp)"
trap 'rm -f "$MIGRATE_LOG"' EXIT

if ! $DC -f "$COMPOSE_FILE" run --rm migrate >"$MIGRATE_LOG" 2>&1; then
  while IFS= read -r line; do echo -e "  ${CYAN}[prisma]${NC} $line"; done < "$MIGRATE_LOG"
  err "Las migraciones Prisma fallaron. Revisa los logs arriba."
  err "Sugerencia: $DC -f $COMPOSE_FILE run --rm migrate"
  exit 1
fi

while IFS= read -r line; do echo -e "  ${CYAN}[prisma]${NC} $line"; done < "$MIGRATE_LOG"

log "✅ Migraciones aplicadas."

# ── 4. LEVANTAR MICROSERVICIOS ────────────────────────────────────────────────
sep
log "Levantando todos los microservicios en segundo plano..."

$DC -f "$COMPOSE_FILE" $PROFILES up -d \
  gateway auth-service catalog-service inventory-service \
  pos-service finance-service hr-service report-service

# Esperar a que el gateway responda
log "Esperando a que el Gateway responda en :3000..."
if ! wait_for "Gateway" 120 bash -c 'curl -sf http://localhost:3000/health >/dev/null 2>&1 || curl -sf http://localhost:3000/api/docs >/dev/null 2>&1'; then
  warn "Gateway tardó más de lo esperado. Verifica con: $DC -f $COMPOSE_FILE logs gateway"
fi

# ── REPORTE FINAL ─────────────────────────────────────────────────────────────
sep
echo ""
echo -e "${GREEN}  ✅ Stack nm-services levantado correctamente${NC}"
echo ""
echo -e "${CYAN}  ACCESO PÚBLICO (API Gateway)${NC}"
echo -e "  ┌─────────────────────────────────────────────────────┐"
echo -e "  │  API Gateway:    http://localhost:3000              │"
echo -e "  │  Swagger Docs:   http://localhost:3000/api/docs     │"
echo -e "  │  Health Check:   http://localhost:3000/health       │"
echo -e "  │  Servicios:      http://localhost:3000/health/svcs  │"
echo -e "  └─────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  MICROSERVICIOS INTERNOS${NC}"
echo -e "  ┌────────────────────────────────────────────────────────────┐"
echo -e "  │  auth-service      → http://localhost:3001/api/docs       │"
echo -e "  │  catalog-service   → http://localhost:3002/api/docs       │"
echo -e "  │  inventory-service → http://localhost:3003/api/docs       │"
echo -e "  │  pos-service       → http://localhost:3004/api/docs       │"
echo -e "  │  finance-service   → http://localhost:3005/api/docs       │"
echo -e "  │  hr-service        → http://localhost:3006/api/docs       │"
echo -e "  │  report-service    → http://localhost:3007/api/docs       │"
echo -e "  └────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  BASE DE DATOS${NC}"
echo -e "  ┌────────────────────────────────────────────────────────────┐"
echo -e "  │  PostgreSQL:  localhost:${POSTGRES_PORT:-5433}  (DB: nm_services)           │"
echo -e "  │  Redis:       localhost:6379                               │"
echo -e "  └────────────────────────────────────────────────────────────┘"
echo ""
echo -e "${CYAN}  COMANDOS ÚTILES${NC}"
echo -e "  # Logs unificados en tiempo real:"
echo -e "  $DC -f $COMPOSE_FILE logs -f"
echo ""
echo -e "  # Logs de un servicio específico:"
echo -e "  $DC -f $COMPOSE_FILE logs -f gateway"
echo -e "  $DC -f $COMPOSE_FILE logs -f auth-service"
echo ""
echo -e "  # Estado de contenedores:"
echo -e "  $DC -f $COMPOSE_FILE ps"
echo ""
echo -e "  # Bajar el stack:"
echo -e "  ./scripts/start-docker-env.sh --down"
echo ""
sep

# ── LOGS (opcional) ───────────────────────────────────────────────────────────
if $DO_LOGS; then
  log "Mostrando logs en tiempo real (Ctrl+C para salir)..."
  $DC -f "$COMPOSE_FILE" logs -f --tail=50
fi
