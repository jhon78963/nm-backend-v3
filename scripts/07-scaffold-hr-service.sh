#!/usr/bin/env bash
# =============================================================================
# 07-scaffold-hr-service.sh
# Andamia el hr-service: Equipos (Teams), Asistencia, Planillas de pago,
# Clientes y Proveedores.
#
# Equivale en Laravel:
#   TeamController + TeamService
#   AttendanceController (getDailySummary, getByMonth, store)
#   PaymentController (getByMonth, getPayroll, store, update, destroy)
#   CustomerController + CustomerService
#   VendorController + VendorService
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ -f "nest-cli.json" ]] || error "Ejecuta desde la raíz del monorepo."
[[ -d "apps/hr-service" ]] || error "apps/hr-service no existe. Ejecuta 01-setup-monorepo.sh primero."

HR_SRC="apps/hr-service/src"
MIGRATION_KIT="$(dirname "$(realpath "$0")")/.."

copy_kit() {
  local src="$MIGRATION_KIT/$1" dst="$2"
  [[ -f "$src" ]] || { warn "Kit: $src no encontrado."; return; }
  [[ -f "$dst" ]] && { warn "Ya existe: $dst"; return; }
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst" && success "Copiado: $dst"
}

# ─── 1. Módulos NestJS CLI ───────────────────────────────────────────────────
info "Generando módulos del hr-service..."
(
  cd apps/hr-service
  for mod in teams attendance payments customers vendors; do
    nest g module "$mod" --no-spec 2>/dev/null || warn "$mod ya existe."
  done
  for svc in \
    teams/teams \
    attendance/attendance \
    payments/payments \
    customers/customers \
    vendors/vendors; do
    nest g service "$svc" --no-spec --flat 2>/dev/null || warn "Service $svc ya existe."
  done
  for ctrl in teams/teams attendance/attendance payments/payments customers/customers vendors/vendors; do
    nest g controller "$ctrl" --no-spec --flat 2>/dev/null || warn "Controller $ctrl ya existe."
  done
)
success "Módulos generados."

# ─── 2. Copiar fuentes ───────────────────────────────────────────────────────

copy_kit "apps/hr-service/src/main.ts"                                   "$HR_SRC/main.ts"
copy_kit "apps/hr-service/src/app.module.ts"                             "$HR_SRC/app.module.ts"

# Teams
copy_kit "apps/hr-service/src/teams/teams.service.ts"                   "$HR_SRC/teams/teams.service.ts"
copy_kit "apps/hr-service/src/teams/teams.controller.ts"                "$HR_SRC/teams/teams.controller.ts"
copy_kit "apps/hr-service/src/teams/teams.module.ts"                    "$HR_SRC/teams/teams.module.ts"
copy_kit "apps/hr-service/src/teams/dto/create-team.dto.ts"             "$HR_SRC/teams/dto/create-team.dto.ts"

# Attendance
copy_kit "apps/hr-service/src/attendance/attendance.service.ts"         "$HR_SRC/attendance/attendance.service.ts"
copy_kit "apps/hr-service/src/attendance/attendance.controller.ts"      "$HR_SRC/attendance/attendance.controller.ts"
copy_kit "apps/hr-service/src/attendance/dto/record-attendance.dto.ts"  "$HR_SRC/attendance/dto/record-attendance.dto.ts"

# Payments (planilla)
copy_kit "apps/hr-service/src/payments/payments.service.ts"             "$HR_SRC/payments/payments.service.ts"
copy_kit "apps/hr-service/src/payments/payments.controller.ts"          "$HR_SRC/payments/payments.controller.ts"
copy_kit "apps/hr-service/src/payments/dto/create-payment.dto.ts"       "$HR_SRC/payments/dto/create-payment.dto.ts"

# Customers / Vendors
copy_kit "apps/hr-service/src/customers/customers.service.ts"           "$HR_SRC/customers/customers.service.ts"
copy_kit "apps/hr-service/src/customers/customers.controller.ts"        "$HR_SRC/customers/customers.controller.ts"
copy_kit "apps/hr-service/src/customers/dto/create-customer.dto.ts"     "$HR_SRC/customers/dto/create-customer.dto.ts"
copy_kit "apps/hr-service/src/vendors/vendors.service.ts"               "$HR_SRC/vendors/vendors.service.ts"
copy_kit "apps/hr-service/src/vendors/vendors.controller.ts"            "$HR_SRC/vendors/vendors.controller.ts"

# Tests
copy_kit "apps/hr-service/src/teams/teams.service.spec.ts"              "$HR_SRC/teams/teams.service.spec.ts"
copy_kit "apps/hr-service/src/attendance/attendance.service.spec.ts"    "$HR_SRC/attendance/attendance.service.spec.ts"
copy_kit "apps/hr-service/src/payments/payments.service.spec.ts"        "$HR_SRC/payments/payments.service.spec.ts"
copy_kit "apps/hr-service/src/customers/customers.service.spec.ts"      "$HR_SRC/customers/customers.service.spec.ts"

# ─── 3. Tests ─────────────────────────────────────────────────────────────────
info "Ejecutando tests del hr-service..."
npm run test:hr 2>&1 | tee /tmp/hr-test-output.log
grep -q "PASS\|Tests:" /tmp/hr-test-output.log \
  && success "Tests del hr-service OK." \
  || warn "Algunos tests fallaron. Revisa /tmp/hr-test-output.log"

# ─── 4. Comandos Git ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Comandos Git para el hr-service:                           ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/hr-service/src/
  git commit -m \"feat(hr): add teams, attendance, payroll, customers and vendors management\"

  git add apps/hr-service/src/**/*.spec.ts
  git commit -m \"test(hr): add unit tests for teams, attendance and payment services\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
