#!/usr/bin/env bash
# =============================================================================
# 06-scaffold-finance-service.sh
# Andamia el finance-service: Flujo de caja (CashMovement), cuentas acumuladas
# y resumen financiero consolidado por warehouse y mes contable.
#
# Equivale en Laravel:
#   CashflowController + CashflowService
#   AccumulatedAccountController + AccumulatedAccountService
#   FinancialSummaryController + FinancialSummaryService
#   NodeUploaderService (vouchers de comprobantes)
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ -f "nest-cli.json" ]] || error "Ejecuta desde la raíz del monorepo."
[[ -d "apps/finance-service" ]] || error "apps/finance-service no existe."

FIN_SRC="apps/finance-service/src"
MIGRATION_KIT="$(dirname "$(realpath "$0")")/.."

copy_kit() {
  local src="$MIGRATION_KIT/$1" dst="$2"
  [[ -f "$src" ]] || { warn "Kit: $src no encontrado."; return; }
  [[ -f "$dst" ]] && { warn "Ya existe: $dst"; return; }
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst" && success "Copiado: $dst"
}

# ─── 1. Módulos NestJS CLI ───────────────────────────────────────────────────
info "Generando módulos del finance-service..."
(
  cd apps/finance-service
  for mod in cashflow accumulated financial-summary uploader; do
    nest g module "$mod" --no-spec 2>/dev/null || warn "$mod ya existe."
  done
  for svc in \
    cashflow/cashflow \
    accumulated/accumulated-account \
    financial-summary/financial-summary \
    uploader/node-uploader; do
    nest g service "$svc" --no-spec --flat 2>/dev/null || warn "Service $svc ya existe."
  done
  for ctrl in cashflow/cashflow accumulated/accumulated-account financial-summary/financial-summary; do
    nest g controller "$ctrl" --no-spec --flat 2>/dev/null || warn "Controller $ctrl ya existe."
  done
)
success "Módulos generados."

# ─── 2. Dependencias ─────────────────────────────────────────────────────────
info "Instalando dependencias del finance-service..."
npm install dayjs @fastify/multipart form-data
success "Dependencias instaladas."

# ─── 3. Copiar fuentes ───────────────────────────────────────────────────────

copy_kit "apps/finance-service/src/main.ts"                                             "$FIN_SRC/main.ts"
copy_kit "apps/finance-service/src/app.module.ts"                                       "$FIN_SRC/app.module.ts"

# Cashflow
copy_kit "apps/finance-service/src/cashflow/cashflow.service.ts"                        "$FIN_SRC/cashflow/cashflow.service.ts"
copy_kit "apps/finance-service/src/cashflow/cashflow.controller.ts"                     "$FIN_SRC/cashflow/cashflow.controller.ts"
copy_kit "apps/finance-service/src/cashflow/cashflow.module.ts"                         "$FIN_SRC/cashflow/cashflow.module.ts"
copy_kit "apps/finance-service/src/cashflow/dto/create-cash-movement.dto.ts"            "$FIN_SRC/cashflow/dto/create-cash-movement.dto.ts"
copy_kit "apps/finance-service/src/cashflow/dto/cashflow-filters.dto.ts"                "$FIN_SRC/cashflow/dto/cashflow-filters.dto.ts"

# Accumulated account
copy_kit "apps/finance-service/src/accumulated/accumulated-account.service.ts"          "$FIN_SRC/accumulated/accumulated-account.service.ts"
copy_kit "apps/finance-service/src/accumulated/accumulated-account.controller.ts"       "$FIN_SRC/accumulated/accumulated-account.controller.ts"
copy_kit "apps/finance-service/src/accumulated/accumulated.module.ts"                   "$FIN_SRC/accumulated/accumulated.module.ts"
copy_kit "apps/finance-service/src/accumulated/dto/initialize-account.dto.ts"           "$FIN_SRC/accumulated/dto/initialize-account.dto.ts"
copy_kit "apps/finance-service/src/accumulated/dto/month-end-transfer.dto.ts"           "$FIN_SRC/accumulated/dto/month-end-transfer.dto.ts"

# Financial summary
copy_kit "apps/finance-service/src/financial-summary/financial-summary.service.ts"      "$FIN_SRC/financial-summary/financial-summary.service.ts"
copy_kit "apps/finance-service/src/financial-summary/financial-summary.controller.ts"   "$FIN_SRC/financial-summary/financial-summary.controller.ts"
copy_kit "apps/finance-service/src/financial-summary/financial-summary.module.ts"       "$FIN_SRC/financial-summary/financial-summary.module.ts"

# Node uploader proxy
copy_kit "apps/finance-service/src/uploader/node-uploader.service.ts"                   "$FIN_SRC/uploader/node-uploader.service.ts"

# Tests
copy_kit "apps/finance-service/src/cashflow/cashflow.service.spec.ts"                   "$FIN_SRC/cashflow/cashflow.service.spec.ts"
copy_kit "apps/finance-service/src/accumulated/accumulated-account.service.spec.ts"     "$FIN_SRC/accumulated/accumulated-account.service.spec.ts"
copy_kit "apps/finance-service/src/financial-summary/financial-summary.service.spec.ts" "$FIN_SRC/financial-summary/financial-summary.service.spec.ts"

# ─── 4. Variables de entorno ──────────────────────────────────────────────────
if [[ -f ".env" ]] && ! grep -q "UPLOADER_URL" .env; then
  cat >> .env <<'ENVVARS'

# ── Finance Service / Node Uploader ──────────────────────────────────────────
UPLOADER_URL="http://localhost:3050"
UPLOADER_API_KEY="CHANGE_ME_uploader_api_key"
ENVVARS
  success ".env actualizado con UPLOADER_URL."
fi

# ─── 5. Tests ─────────────────────────────────────────────────────────────────
info "Ejecutando tests del finance-service..."
npm run test:finance 2>&1 | tee /tmp/finance-test-output.log
grep -q "PASS\|Tests:" /tmp/finance-test-output.log \
  && success "Tests del finance-service OK." \
  || warn "Algunos tests fallaron. Revisa /tmp/finance-test-output.log"

# ─── 6. Comandos Git ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Comandos Git para el finance-service:                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/finance-service/src/ .env.example
  git commit -m \"feat(finance): add cashflow crud, accumulated accounts and financial summary\"

  git add apps/finance-service/src/**/*.spec.ts
  git commit -m \"test(finance): add unit tests for cashflow and accumulated account service\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
