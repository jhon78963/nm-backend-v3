#!/usr/bin/env bash
# =============================================================================
# 04-scaffold-inventory-service.sh
# Andamia el inventory-service: ledger de stock, compras, kardex
# y reconciliación de inventario.
#
# Equivale en Laravel:
#   InventoryMovementService + InventoryBalanceService (ledger)
#   PurchaseBulkService + PurchaseLineMutationService
#   PurchaseCancellationService + PurchaseDocumentService
#   InventoryKardexReportService + InventoryReconciliationPosSalesService
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ -f "nest-cli.json" ]] || error "Ejecuta desde la raíz del monorepo."
[[ -d "apps/inventory-service" ]] || error "apps/inventory-service no existe."

INV_SRC="apps/inventory-service/src"
MIGRATION_KIT="$(dirname "$(realpath "$0")")/.."

copy_kit() {
  local src="$MIGRATION_KIT/$1" dst="$2"
  [[ -f "$src" ]] || { warn "Kit: $src no encontrado."; return; }
  [[ -f "$dst" ]] && { warn "Ya existe: $dst"; return; }
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst" && success "Copiado: $dst"
}

# ─── 1. Módulos NestJS CLI ───────────────────────────────────────────────────
info "Generando módulos del inventory-service..."
(
  cd apps/inventory-service
  for mod in inventory purchases kardex reconciliation; do
    nest g module "$mod" --no-spec 2>/dev/null || warn "$mod ya existe."
  done
  for svc in \
    inventory/inventory-balance \
    inventory/inventory-movement \
    purchases/purchases \
    purchases/purchase-line \
    kardex/kardex \
    reconciliation/reconciliation; do
    nest g service "$svc" --no-spec --flat 2>/dev/null || warn "Service $svc ya existe."
  done
  for ctrl in purchases/purchases kardex/kardex reconciliation/reconciliation; do
    nest g controller "$ctrl" --no-spec --flat 2>/dev/null || warn "Controller $ctrl ya existe."
  done
)
success "Módulos CLI generados."

# ─── 2. Dependencias adicionales ─────────────────────────────────────────────
info "Instalando dependencias..."
npm install exceljs dayjs
success "Dependencias instaladas."

# ─── 3. Copiar fuentes del migration kit ────────────────────────────────────

# App shell
copy_kit "apps/inventory-service/src/main.ts"                                     "$INV_SRC/main.ts"
copy_kit "apps/inventory-service/src/app.module.ts"                               "$INV_SRC/app.module.ts"

# Inventory ledger
copy_kit "apps/inventory-service/src/inventory/inventory-balance.service.ts"      "$INV_SRC/inventory/inventory-balance.service.ts"
copy_kit "apps/inventory-service/src/inventory/inventory-movement.service.ts"     "$INV_SRC/inventory/inventory-movement.service.ts"
copy_kit "apps/inventory-service/src/inventory/inventory.module.ts"               "$INV_SRC/inventory/inventory.module.ts"
copy_kit "apps/inventory-service/src/inventory/dto/adjust-stock.dto.ts"           "$INV_SRC/inventory/dto/adjust-stock.dto.ts"

# Purchases
copy_kit "apps/inventory-service/src/purchases/purchases.service.ts"              "$INV_SRC/purchases/purchases.service.ts"
copy_kit "apps/inventory-service/src/purchases/purchases.controller.ts"           "$INV_SRC/purchases/purchases.controller.ts"
copy_kit "apps/inventory-service/src/purchases/purchase-line.service.ts"          "$INV_SRC/purchases/purchase-line.service.ts"
copy_kit "apps/inventory-service/src/purchases/purchases.module.ts"               "$INV_SRC/purchases/purchases.module.ts"
copy_kit "apps/inventory-service/src/purchases/dto/register-bulk-purchase.dto.ts" "$INV_SRC/purchases/dto/register-bulk-purchase.dto.ts"
copy_kit "apps/inventory-service/src/purchases/dto/add-purchase-line.dto.ts"      "$INV_SRC/purchases/dto/add-purchase-line.dto.ts"
copy_kit "apps/inventory-service/src/purchases/dto/update-purchase.dto.ts"        "$INV_SRC/purchases/dto/update-purchase.dto.ts"

# Kardex
copy_kit "apps/inventory-service/src/kardex/kardex.service.ts"                   "$INV_SRC/kardex/kardex.service.ts"
copy_kit "apps/inventory-service/src/kardex/kardex.controller.ts"                "$INV_SRC/kardex/kardex.controller.ts"
copy_kit "apps/inventory-service/src/kardex/kardex.module.ts"                    "$INV_SRC/kardex/kardex.module.ts"

# Reconciliation
copy_kit "apps/inventory-service/src/reconciliation/reconciliation.service.ts"   "$INV_SRC/reconciliation/reconciliation.service.ts"
copy_kit "apps/inventory-service/src/reconciliation/reconciliation.controller.ts" "$INV_SRC/reconciliation/reconciliation.controller.ts"
copy_kit "apps/inventory-service/src/reconciliation/reconciliation.module.ts"    "$INV_SRC/reconciliation/reconciliation.module.ts"

# Tests
copy_kit "apps/inventory-service/src/purchases/purchases.service.spec.ts"        "$INV_SRC/purchases/purchases.service.spec.ts"
copy_kit "apps/inventory-service/src/inventory/inventory-balance.service.spec.ts" "$INV_SRC/inventory/inventory-balance.service.spec.ts"
copy_kit "apps/inventory-service/src/inventory/inventory-movement.service.spec.ts" "$INV_SRC/inventory/inventory-movement.service.spec.ts"
copy_kit "apps/inventory-service/src/kardex/kardex.service.spec.ts"              "$INV_SRC/kardex/kardex.service.spec.ts"

# ─── 4. Tests ─────────────────────────────────────────────────────────────────
info "Ejecutando suite de tests del inventory-service..."
npm run test:inventory 2>&1 | tee /tmp/inventory-test-output.log
grep -q "PASS\|Tests:" /tmp/inventory-test-output.log \
  && success "Tests del inventory-service OK." \
  || warn "Algunos tests fallaron. Revisa /tmp/inventory-test-output.log"

# ─── 5. Comandos Git ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Comandos Git para el inventory-service:                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/inventory-service/src/ libs/database/prisma/schema.prisma
  git commit -m \"feat(inventory): add ledger, purchases bulk registration and kardex report\"

  git add apps/inventory-service/src/**/*.spec.ts
  git commit -m \"test(inventory): add unit tests for balance ledger and purchase service\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
