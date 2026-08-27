#!/usr/bin/env bash
# =============================================================================
# 03-scaffold-catalog-service.sh
# Andamia el catalog-service: Productos, Colores, Tallas, Géneros,
# import/export Excel y sincronización WooCommerce.
#
# Equivale en Laravel:
#   ProductController + ProductService + ProductSizeService
#   ProductSizeColorService + ColorService + SizeService + GenderService
#   WooCommerceSyncService + ProductImportService + ProductExportService
#   ProductHistoryService + ProductMediaService
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

[[ -f "nest-cli.json" ]] || error "Ejecuta desde la raíz del monorepo."
[[ -d "apps/catalog-service" ]] || error "apps/catalog-service no existe. Ejecuta 01-setup-monorepo.sh primero."

CATALOG_SRC="apps/catalog-service/src"
MIGRATION_KIT="$(dirname "$(realpath "$0")")/.."

# ─── Función: copiar desde el kit ────────────────────────────────────────────
copy_kit() {
  local src="$MIGRATION_KIT/$1" dst="$2"
  [[ -f "$src" ]] || { warn "Kit: $src no encontrado."; return; }
  [[ -f "$dst" ]] && { warn "Ya existe: $dst"; return; }
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst" && success "Copiado: $dst"
}

# ─── 1. Generar módulos con NestJS CLI ───────────────────────────────────────
info "Generando módulos del catalog-service..."
(
  cd apps/catalog-service
  for mod in products colors sizes genders "product-history" woocommerce; do
    nest g module "$mod" --no-spec 2>/dev/null || warn "Módulo $mod ya existe."
  done
  for svc in products/products colors/colors sizes/sizes genders/genders woocommerce/woocommerce-sync; do
    nest g service "$svc" --no-spec --flat 2>/dev/null || warn "Service $svc ya existe."
  done
  for ctrl in products/products colors/colors sizes/sizes; do
    nest g controller "$ctrl" --no-spec --flat 2>/dev/null || warn "Controller $ctrl ya existe."
  done
)
success "Módulos CLI generados."

# ─── 2. Instalar dependencias específicas del catalog-service ────────────────
info "Instalando dependencias adicionales..."
npm install \
  @woocommerce/woocommerce-rest-api \
  exceljs \
  sharp \
  multer \
  @fastify/multipart

npm install --save-dev \
  @types/multer

success "Dependencias instaladas."

# ─── 3. Copiar código fuente desde el migration kit ─────────────────────────

# App module + main
copy_kit "apps/catalog-service/src/main.ts"                                     "$CATALOG_SRC/main.ts"
copy_kit "apps/catalog-service/src/app.module.ts"                               "$CATALOG_SRC/app.module.ts"

# Products
copy_kit "apps/catalog-service/src/products/products.module.ts"                 "$CATALOG_SRC/products/products.module.ts"
copy_kit "apps/catalog-service/src/products/products.service.ts"                "$CATALOG_SRC/products/products.service.ts"
copy_kit "apps/catalog-service/src/products/products.controller.ts"             "$CATALOG_SRC/products/products.controller.ts"
copy_kit "apps/catalog-service/src/products/dto/create-product.dto.ts"          "$CATALOG_SRC/products/dto/create-product.dto.ts"
copy_kit "apps/catalog-service/src/products/dto/update-product.dto.ts"          "$CATALOG_SRC/products/dto/update-product.dto.ts"
copy_kit "apps/catalog-service/src/products/dto/product-filters.dto.ts"         "$CATALOG_SRC/products/dto/product-filters.dto.ts"
copy_kit "apps/catalog-service/src/products/dto/add-product-size.dto.ts"        "$CATALOG_SRC/products/dto/add-product-size.dto.ts"
copy_kit "apps/catalog-service/src/products/dto/add-size-color.dto.ts"          "$CATALOG_SRC/products/dto/add-size-color.dto.ts"
copy_kit "apps/catalog-service/src/products/entities/product.entity.ts"         "$CATALOG_SRC/products/entities/product.entity.ts"

# Colors
copy_kit "apps/catalog-service/src/colors/colors.service.ts"                   "$CATALOG_SRC/colors/colors.service.ts"
copy_kit "apps/catalog-service/src/colors/colors.controller.ts"                "$CATALOG_SRC/colors/colors.controller.ts"
copy_kit "apps/catalog-service/src/colors/dto/create-color.dto.ts"             "$CATALOG_SRC/colors/dto/create-color.dto.ts"

# Sizes
copy_kit "apps/catalog-service/src/sizes/sizes.service.ts"                     "$CATALOG_SRC/sizes/sizes.service.ts"
copy_kit "apps/catalog-service/src/sizes/sizes.controller.ts"                  "$CATALOG_SRC/sizes/sizes.controller.ts"
copy_kit "apps/catalog-service/src/sizes/dto/create-size.dto.ts"               "$CATALOG_SRC/sizes/dto/create-size.dto.ts"

# WooCommerce
copy_kit "apps/catalog-service/src/woocommerce/woocommerce-sync.service.ts"    "$CATALOG_SRC/woocommerce/woocommerce-sync.service.ts"
copy_kit "apps/catalog-service/src/woocommerce/woocommerce-sync.module.ts"     "$CATALOG_SRC/woocommerce/woocommerce-sync.module.ts"

# Product History
copy_kit "apps/catalog-service/src/product-history/product-history.service.ts" "$CATALOG_SRC/product-history/product-history.service.ts"

# Tests
copy_kit "apps/catalog-service/src/products/products.service.spec.ts"          "$CATALOG_SRC/products/products.service.spec.ts"
copy_kit "apps/catalog-service/src/products/products.controller.spec.ts"       "$CATALOG_SRC/products/products.controller.spec.ts"
copy_kit "apps/catalog-service/src/colors/colors.service.spec.ts"              "$CATALOG_SRC/colors/colors.service.spec.ts"
copy_kit "apps/catalog-service/src/woocommerce/woocommerce-sync.service.spec.ts" "$CATALOG_SRC/woocommerce/woocommerce-sync.service.spec.ts"

# ─── 4. Ejecutar tests ────────────────────────────────────────────────────────
info "Ejecutando suite de tests del catalog-service..."
npm run test:catalog 2>&1 | tee /tmp/catalog-test-output.log
grep -q "PASS\|Tests:" /tmp/catalog-test-output.log \
  && success "Tests del catalog-service OK." \
  || warn "Algunos tests fallaron. Revisa /tmp/catalog-test-output.log"

# ─── 5. Comandos Git ──────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Comandos Git para el catalog-service:                      ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}
  git add apps/catalog-service/src/ libs/database/prisma/schema.prisma
  git commit -m \"feat(catalog): add products crud with sizes, colors and woocommerce sync\"

  git add apps/catalog-service/src/**/*.spec.ts
  git commit -m \"test(catalog): add unit tests for products service and woocommerce sync\"
${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
