#!/usr/bin/env bash
# =============================================================================
# 02-scaffold-auth-service.sh
# Andamia el auth-service: módulos, guards, estrategias y tests.
# Equivale a Laravel: AuthController + AuthService + UserController
#   + Sanctum tokens + Spatie RBAC + PasswordSecurity middleware.
# Idempotente: verifica existencia antes de crear cada archivo.
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Validar que estamos en la raíz del monorepo ────────────────────────────
[[ -f "nest-cli.json" ]] || error "Ejecuta este script desde la raíz del monorepo (donde existe nest-cli.json)."
[[ -d "apps/auth-service" ]] || error "apps/auth-service no existe. Ejecuta 01-setup-monorepo.sh primero."

AUTH_SRC="apps/auth-service/src"
COMMON_SRC="libs/common/src"

# ─── Función helper: crea archivo solo si no existe ─────────────────────────
write_file() {
  local path="$1"
  local content="$2"
  if [[ -f "$path" ]]; then
    warn "Ya existe: $path — Saltando."
    return
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s' "$content" > "$path"
  success "Creado: $path"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 1: Módulo raíz del auth-service
# ═══════════════════════════════════════════════════════════════════════════════

info "Generando módulos NestJS del auth-service..."

# Los comandos `nest g` son idempotentes respecto a si el archivo ya existe;
# usamos --flat=false para respetar subdirectorios.
(
  cd apps/auth-service
  nest g module auth          --no-spec 2>/dev/null || warn "Módulo auth ya existe."
  nest g module users         --no-spec 2>/dev/null || warn "Módulo users ya existe."
  nest g module tenants       --no-spec 2>/dev/null || warn "Módulo tenants ya existe."
  nest g module roles         --no-spec 2>/dev/null || warn "Módulo roles ya existe."
  nest g module audit         --no-spec 2>/dev/null || warn "Módulo audit ya existe."

  nest g controller auth/auth --no-spec --flat 2>/dev/null || warn "Controller auth ya existe."
  nest g controller users/users --no-spec --flat 2>/dev/null || warn "Controller users ya existe."

  nest g service auth/auth     --no-spec --flat 2>/dev/null || warn "Service auth ya existe."
  nest g service users/users   --no-spec --flat 2>/dev/null || warn "Service users ya existe."
  nest g service tenants/tenants --no-spec --flat 2>/dev/null || warn "Service tenants ya existe."
)

success "Módulos NestJS generados."

# ═══════════════════════════════════════════════════════════════════════════════
# SECCIÓN 2: Copiar código fuente desde el migration kit
# ═══════════════════════════════════════════════════════════════════════════════
MIGRATION_KIT_DIR="$(dirname "$(realpath "$0")")/.."

copy_kit_file() {
  local src="$MIGRATION_KIT_DIR/$1"
  local dst="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    success "Copiado: $dst"
  else
    warn "Archivo de kit no encontrado: $src"
  fi
}

# DTOs
copy_kit_file "apps/auth-service/src/auth/dto/login.dto.ts"            "$AUTH_SRC/auth/dto/login.dto.ts"
copy_kit_file "apps/auth-service/src/auth/dto/refresh-token.dto.ts"    "$AUTH_SRC/auth/dto/refresh-token.dto.ts"
copy_kit_file "apps/auth-service/src/auth/dto/change-password.dto.ts"  "$AUTH_SRC/auth/dto/change-password.dto.ts"
copy_kit_file "apps/auth-service/src/auth/dto/forgot-password.dto.ts"  "$AUTH_SRC/auth/dto/forgot-password.dto.ts"
copy_kit_file "apps/auth-service/src/auth/dto/reset-password.dto.ts"   "$AUTH_SRC/auth/dto/reset-password.dto.ts"

# Estrategias JWT
copy_kit_file "apps/auth-service/src/auth/strategies/jwt.strategy.ts"         "$AUTH_SRC/auth/strategies/jwt.strategy.ts"
copy_kit_file "apps/auth-service/src/auth/strategies/jwt-refresh.strategy.ts" "$AUTH_SRC/auth/strategies/jwt-refresh.strategy.ts"

# Core service files (sobrescriben los stubs generados por CLI)
copy_kit_file "apps/auth-service/src/auth/auth.service.ts"      "$AUTH_SRC/auth/auth.service.ts"
copy_kit_file "apps/auth-service/src/auth/auth.controller.ts"   "$AUTH_SRC/auth/auth.controller.ts"
copy_kit_file "apps/auth-service/src/auth/auth.module.ts"       "$AUTH_SRC/auth/auth.module.ts"
copy_kit_file "apps/auth-service/src/users/users.service.ts"    "$AUTH_SRC/users/users.service.ts"
copy_kit_file "apps/auth-service/src/app.module.ts"             "$AUTH_SRC/app.module.ts"
copy_kit_file "apps/auth-service/src/main.ts"                   "$AUTH_SRC/main.ts"

# Libs compartidas
copy_kit_file "libs/common/src/guards/jwt-auth.guard.ts"        "$COMMON_SRC/guards/jwt-auth.guard.ts"
copy_kit_file "libs/common/src/guards/roles.guard.ts"           "$COMMON_SRC/guards/roles.guard.ts"
copy_kit_file "libs/common/src/guards/warehouse.guard.ts"       "$COMMON_SRC/guards/warehouse.guard.ts"
copy_kit_file "libs/common/src/decorators/current-user.decorator.ts" "$COMMON_SRC/decorators/current-user.decorator.ts"
copy_kit_file "libs/common/src/decorators/roles.decorator.ts"   "$COMMON_SRC/decorators/roles.decorator.ts"
copy_kit_file "libs/common/src/decorators/public.decorator.ts"  "$COMMON_SRC/decorators/public.decorator.ts"
copy_kit_file "libs/common/src/filters/global-exception.filter.ts" "$COMMON_SRC/filters/global-exception.filter.ts"
copy_kit_file "libs/common/src/interceptors/logging.interceptor.ts" "$COMMON_SRC/interceptors/logging.interceptor.ts"

# Tests
copy_kit_file "apps/auth-service/src/auth/auth.service.spec.ts"    "$AUTH_SRC/auth/auth.service.spec.ts"
copy_kit_file "apps/auth-service/src/auth/auth.controller.spec.ts" "$AUTH_SRC/auth/auth.controller.spec.ts"
copy_kit_file "apps/auth-service/src/users/users.service.spec.ts"  "$AUTH_SRC/users/users.service.spec.ts"

# Prisma
copy_kit_file "libs/database/prisma/schema.prisma" "prisma/schema.prisma"

# ─── Generar cliente Prisma ──────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  info "Generando cliente Prisma..."
  npx prisma generate && success "Cliente Prisma generado."
else
  warn ".env no encontrado. Ejecuta 'npx prisma generate' manualmente tras configurar DATABASE_URL."
fi

# ─── Ejecutar tests del auth-service ────────────────────────────────────────
info "Ejecutando suite de tests del auth-service..."
echo ""
echo "  npm run test:auth"
echo ""
npm run test:auth 2>&1 | tee /tmp/auth-test-output.log
echo ""
if grep -q "PASS" /tmp/auth-test-output.log; then
  success "Todos los tests del auth-service pasaron."
else
  warn "Algunos tests fallaron. Revisa /tmp/auth-test-output.log"
fi

# ─── Resumen de comandos Git ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  auth-service scaffolded. Comandos Git para commit limpio:  ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/auth-service/ libs/common/ libs/database/ prisma/ .env.example
  git commit -m \"feat(auth): bootstrap auth-service with JWT, RBAC and warehouse scoping\"

  git add apps/auth-service/src/**/*.spec.ts
  git commit -m \"test(auth): add unit tests for AuthService, AuthController and UsersService\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
