#!/usr/bin/env bash
# =============================================================================
# 05-scaffold-pos-service.sh
# Andamia el pos-service: Checkout POS, Ventas, SUNAT/Greenter wrapper,
# generación de tickets y exchange de moneda.
#
# Equivale en Laravel:
#   PosController (searchProduct, searchCustomer, checkout, ticket)
#   SaleController (CRUD, PDF, exchange, monthly-stats)
#   ElectronicDocumentService + GreenterBuilderService + DocumentSeriesService
#   SunatService (DNI/RUC lookup)
#
# ESTRATEGIA SUNAT:
#   pos-service ──HTTP──> nm-backend (Laravel, solo rutas /api/fiscal/*)
#   Esto preserva la integración Greenter PHP sin riesgo fiscal durante la migración.
#   Ver docs/bounded-contexts.md → "Estrategia Greenter"
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ -f "nest-cli.json" ]] || error "Ejecuta desde la raíz del monorepo."
[[ -d "apps/pos-service" ]] || error "apps/pos-service no existe. Ejecuta 01-setup-monorepo.sh primero."

POS_SRC="apps/pos-service/src"
MIGRATION_KIT="$(dirname "$(realpath "$0")")/.."

copy_kit() {
  local src="$MIGRATION_KIT/$1" dst="$2"
  [[ -f "$src" ]] || { warn "Kit: $src no encontrado."; return; }
  [[ -f "$dst" ]] && { warn "Ya existe: $dst"; return; }
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst" && success "Copiado: $dst"
}

# ─── 1. Módulos NestJS CLI ───────────────────────────────────────────────────
info "Generando módulos del pos-service..."
(
  cd apps/pos-service
  for mod in checkout sales sunat tickets; do
    nest g module "$mod" --no-spec 2>/dev/null || warn "$mod ya existe."
  done
  for svc in checkout/checkout sales/sales sunat/sunat sunat/document-series tickets/ticket; do
    nest g service "$svc" --no-spec --flat 2>/dev/null || warn "Service $svc ya existe."
  done
  for ctrl in checkout/checkout sales/sales tickets/ticket; do
    nest g controller "$ctrl" --no-spec --flat 2>/dev/null || warn "Controller $ctrl ya existe."
  done
)
success "Módulos generados."

# ─── 2. Dependencias adicionales ─────────────────────────────────────────────
info "Instalando dependencias del pos-service..."
npm install pdfkit qrcode dayjs
npm install --save-dev @types/pdfkit @types/qrcode
success "Dependencias instaladas."

# ─── 3. Copiar fuentes ───────────────────────────────────────────────────────

copy_kit "apps/pos-service/src/main.ts"                                     "$POS_SRC/main.ts"
copy_kit "apps/pos-service/src/app.module.ts"                               "$POS_SRC/app.module.ts"

# Checkout
copy_kit "apps/pos-service/src/checkout/checkout.service.ts"                "$POS_SRC/checkout/checkout.service.ts"
copy_kit "apps/pos-service/src/checkout/checkout.controller.ts"             "$POS_SRC/checkout/checkout.controller.ts"
copy_kit "apps/pos-service/src/checkout/checkout.module.ts"                 "$POS_SRC/checkout/checkout.module.ts"
copy_kit "apps/pos-service/src/checkout/dto/checkout.dto.ts"                "$POS_SRC/checkout/dto/checkout.dto.ts"

# Sales
copy_kit "apps/pos-service/src/sales/sales.service.ts"                     "$POS_SRC/sales/sales.service.ts"
copy_kit "apps/pos-service/src/sales/sales.controller.ts"                  "$POS_SRC/sales/sales.controller.ts"
copy_kit "apps/pos-service/src/sales/sales.module.ts"                      "$POS_SRC/sales/sales.module.ts"
copy_kit "apps/pos-service/src/sales/dto/sales-filters.dto.ts"             "$POS_SRC/sales/dto/sales-filters.dto.ts"
copy_kit "apps/pos-service/src/sales/dto/update-sale.dto.ts"               "$POS_SRC/sales/dto/update-sale.dto.ts"

# SUNAT wrapper
copy_kit "apps/pos-service/src/sunat/sunat.service.ts"                     "$POS_SRC/sunat/sunat.service.ts"
copy_kit "apps/pos-service/src/sunat/document-series.service.ts"           "$POS_SRC/sunat/document-series.service.ts"
copy_kit "apps/pos-service/src/sunat/sunat.module.ts"                      "$POS_SRC/sunat/sunat.module.ts"

# Tickets
copy_kit "apps/pos-service/src/tickets/ticket.service.ts"                  "$POS_SRC/tickets/ticket.service.ts"
copy_kit "apps/pos-service/src/tickets/ticket.controller.ts"               "$POS_SRC/tickets/ticket.controller.ts"
copy_kit "apps/pos-service/src/tickets/ticket.module.ts"                   "$POS_SRC/tickets/ticket.module.ts"

# Tests
copy_kit "apps/pos-service/src/checkout/checkout.service.spec.ts"          "$POS_SRC/checkout/checkout.service.spec.ts"
copy_kit "apps/pos-service/src/sales/sales.service.spec.ts"                "$POS_SRC/sales/sales.service.spec.ts"
copy_kit "apps/pos-service/src/sunat/sunat.service.spec.ts"                "$POS_SRC/sunat/sunat.service.spec.ts"
copy_kit "apps/pos-service/src/sunat/document-series.service.spec.ts"      "$POS_SRC/sunat/document-series.service.spec.ts"

# ─── 4. Agregar variable de entorno requeridas ────────────────────────────────
if [[ -f ".env" ]] && ! grep -q "SUNAT_BACKEND_URL" .env; then
  cat >> .env <<'ENVVARS'

# ── POS Service / SUNAT ───────────────────────────────────────────────────────
# URL del nm-backend Laravel actuando como sidecar de facturación electrónica
SUNAT_BACKEND_URL="http://localhost:8000"
SUNAT_BACKEND_API_KEY="CHANGE_ME_pos_service_api_key"
SUNAT_TOKEN=""

# ── Exchange rate (SUNAT) ─────────────────────────────────────────────────────
EXCHANGE_RATE_API_URL="https://api.apis.net.pe/v1/tipo-cambio-sunat"
ENVVARS
  success ".env actualizado con variables del pos-service."
fi

# ─── 5. Tests ─────────────────────────────────────────────────────────────────
info "Ejecutando tests del pos-service..."
npm run test:pos 2>&1 | tee /tmp/pos-test-output.log
grep -q "PASS\|Tests:" /tmp/pos-test-output.log \
  && success "Tests del pos-service OK." \
  || warn "Algunos tests fallaron. Revisa /tmp/pos-test-output.log"

# ─── 6. Comandos Git ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Comandos Git para el pos-service:                          ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/pos-service/src/ .env.example
  git commit -m \"feat(pos): add checkout service with sunat sidecar proxy and ticket generation\"

  git add apps/pos-service/src/**/*.spec.ts
  git commit -m \"test(pos): add unit tests for checkout, sales and sunat document series\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
