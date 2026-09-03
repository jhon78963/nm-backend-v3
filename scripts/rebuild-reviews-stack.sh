#!/usr/bin/env bash
# =============================================================================
# rebuild-reviews-stack.sh — Rebuild Docker tras cambios de reseñas / customer auth
#
# Servicios afectados en Docker:
#   - migrate            → aplica migración product_reviews + ecommerce_customers
#   - ecommerce-service  → API de auth cliente y reseñas (puerto 3012)
#   - gateway            → proxy /api/v1/ecommerce/* (puerto 3000)
#
# NO usan Docker (reiniciar manualmente):
#   - nm-ecommerce       → npm run dev  (puerto 3013)
#   - nm-frontend-v2     → npm start / ng serve (admin moderación)
#
# Uso:
#   ./scripts/rebuild-reviews-stack.sh
#   ./scripts/rebuild-reviews-stack.sh --no-cache
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.full.yml"
PROJECT="${COMPOSE_PROJECT_NAME:-nm-backend-v3}"
NO_CACHE=""

for arg in "$@"; do
  case $arg in
    --no-cache) NO_CACHE="--no-cache" ;;
    --help)
      echo "Uso: $0 [--no-cache]"
      echo "  Reconstruye migrate + ecommerce-service + gateway y aplica migraciones."
      exit 0
      ;;
  esac
done

if docker compose version >/dev/null 2>&1; then
  DC="docker compose -p ${PROJECT}"
else
  DC="docker-compose -p ${PROJECT}"
fi

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log() { echo -e "${GREEN}[rebuild]${NC} $*"; }

log "Proyecto Compose: ${PROJECT}"
log "Compose file: ${COMPOSE_FILE}"
echo ""

log "1/5 — Build migrate (incluye migraciones nuevas) ${NO_CACHE}..."
DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" build $NO_CACHE migrate
echo ""

log "2/5 — Migraciones Prisma..."
$DC -f "$COMPOSE_FILE" run --rm migrate
echo ""

log "3/5 — Build ecommerce-service ${NO_CACHE}..."
DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" build $NO_CACHE ecommerce-service
echo ""

log "4/5 — Build gateway ${NO_CACHE}..."
DOCKER_BUILDKIT=1 $DC -f "$COMPOSE_FILE" build $NO_CACHE gateway
echo ""

log "5/5 — Recrear contenedores..."
$DC -f "$COMPOSE_FILE" up -d --force-recreate ecommerce-service gateway
echo ""

echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}✅ Stack de reseñas listo${NC}"
echo ""
echo "  ecommerce-service → http://localhost:3012/api/docs"
echo "  gateway           → http://localhost:3000/api/docs"
echo ""
echo "  Storefront (sin Docker):"
echo "    cd ../nm-ecommerce && npm run dev"
echo ""
echo "  Admin (sin Docker):"
echo "    cd ../nm-frontend-v2 && npm start"
echo -e "${CYAN}────────────────────────────────────────────────────────${NC}"
