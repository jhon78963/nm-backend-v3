#!/usr/bin/env bash
# =============================================================================
# 01-setup-monorepo.sh
# Inicializa el monorepo NestJS para nm-backend → microservicios
# Idempotente: puede ejecutarse múltiples veces sin efectos secundarios.
# =============================================================================
set -euo pipefail

# ─── Colores para output ────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Configuración ──────────────────────────────────────────────────────────
PROJECT_NAME="nm-services"
BASE_DIR="${1:-$(pwd)/$PROJECT_NAME}"   # Primer arg = destino; default: ./nm-services
MIN_NODE_MAJOR=20
MIN_NPM_MAJOR=10

# ─── 1. Validar entorno ─────────────────────────────────────────────────────
info "Validando entorno de desarrollo..."

command -v node &>/dev/null  || error "Node.js no encontrado. Instala Node >= $MIN_NODE_MAJOR desde https://nodejs.org"
command -v npm  &>/dev/null  || error "npm no encontrado."
command -v git  &>/dev/null  || error "Git no encontrado."

NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
NPM_MAJOR=$(npm  -e "process.stdout.write(String(require('./package.json').version.split('.')[0]))" 2>/dev/null \
            || npm --version | cut -d. -f1)

[[ "$NODE_MAJOR" -ge "$MIN_NODE_MAJOR" ]] \
  || error "Node $NODE_MAJOR detectado. Se requiere >= $MIN_NODE_MAJOR."
[[ "$NPM_MAJOR"  -ge "$MIN_NPM_MAJOR"  ]] \
  || warn  "npm $NPM_MAJOR detectado. Se recomienda >= $MIN_NPM_MAJOR."

success "Node $(node -v) / npm $(npm -v) — OK"

# ─── 2. Instalar @nestjs/cli globalmente (idempotente) ──────────────────────
if command -v nest &>/dev/null; then
  success "NestJS CLI ya instalado: $(nest -v)"
else
  info "Instalando @nestjs/cli globalmente..."
  npm install -g @nestjs/cli
  success "NestJS CLI instalado: $(nest -v)"
fi

# ─── 3. Crear workspace raíz (idempotente) ──────────────────────────────────
if [[ -d "$BASE_DIR" ]]; then
  warn "Directorio '$BASE_DIR' ya existe. Continuando sin sobrescribir."
else
  info "Creando monorepo NestJS en '$BASE_DIR'..."
  # --skip-git: el usuario controla su propio repositorio git
  nest new "$BASE_DIR" --package-manager npm --skip-git --strict
  success "Workspace raíz creado."
fi

cd "$BASE_DIR"

# ─── 4. Convertir a monorepo ────────────────────────────────────────────────
# NestJS genera un proyecto estándar; lo convertimos a monorepo agregando
# la primera app con `nest g app` (el CLI reestructura automáticamente).
if [[ -f "nest-cli.json" ]] && grep -q '"monorepo": true' nest-cli.json 2>/dev/null; then
  success "Ya en modo monorepo. Saltando conversión."
else
  info "Convirtiendo a modo monorepo..."
  # El primer `nest g app` convierte automáticamente
  nest g app gateway --no-spec
  success "Modo monorepo activado. App 'gateway' creada."
fi

# ─── 5. Crear aplicaciones de microservicio ─────────────────────────────────
declare -a APPS=(
  "auth-service"
  "catalog-service"
  "inventory-service"
  "pos-service"
  "finance-service"
  "hr-service"
  "report-service"
  "ai-proxy-service"
)

for APP in "${APPS[@]}"; do
  if [[ -d "apps/$APP" ]]; then
    warn "apps/$APP ya existe. Saltando."
  else
    info "Generando app '$APP'..."
    nest g app "$APP" --no-spec
    success "apps/$APP — creado."
  fi
done

# ─── 6. Crear librerías compartidas ─────────────────────────────────────────
declare -a LIBS=(
  "common"      # Guards, decorators, filtros, interceptors
  "database"    # Cliente Prisma compartido
  "contracts"   # Interfaces y events inter-servicio
)

for LIB in "${LIBS[@]}"; do
  if [[ -d "libs/$LIB" ]]; then
    warn "libs/$LIB ya existe. Saltando."
  else
    info "Generando lib '$LIB'..."
    nest g lib "$LIB" --no-spec
    success "libs/$LIB — creado."
  fi
done

# ─── 7. Instalar dependencias de producción ─────────────────────────────────
info "Instalando dependencias de producción..."
npm install \
  @nestjs/platform-fastify \
  @nestjs/jwt \
  @nestjs/passport \
  @nestjs/throttler \
  @nestjs/swagger \
  @nestjs/config \
  @nestjs/microservices \
  passport \
  passport-jwt \
  class-validator \
  class-transformer \
  prisma \
  @prisma/client \
  bcrypt \
  helmet \
  uuid \
  dayjs

success "Dependencias de producción instaladas."

# ─── 8. Instalar dependencias de desarrollo ──────────────────────────────────
info "Instalando dependencias de desarrollo..."
npm install --save-dev \
  @types/passport-jwt \
  @types/bcrypt \
  @types/supertest \
  @types/uuid \
  supertest \
  jest-mock-extended \
  @faker-js/faker

success "Dependencias de desarrollo instaladas."

# ─── 9. Inicializar Prisma ───────────────────────────────────────────────────
if [[ -f "prisma/schema.prisma" ]]; then
  warn "prisma/schema.prisma ya existe. Saltando init de Prisma."
else
  info "Inicializando Prisma con PostgreSQL..."
  npx prisma init --datasource-provider postgresql
  success "Prisma inicializado. Edita prisma/schema.prisma y DATABASE_URL en .env"
fi

# ─── 10. Crear .env base ─────────────────────────────────────────────────────
if [[ -f ".env" ]]; then
  warn ".env ya existe. No se sobreescribirá."
else
  cat > .env <<'DOTENV'
# ── Base de Datos ────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/nm_services?schema=public"

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET="CHANGE_ME_super_secret_jwt_key_min_32_chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="CHANGE_ME_refresh_secret_min_32_chars"
JWT_REFRESH_EXPIRES_IN="7d"

# ── Aplicación ───────────────────────────────────────────────────────────────
NODE_ENV="development"
APP_PORT=3000
FRONTEND_URL="http://localhost:4200"

# ── Rate limiting ─────────────────────────────────────────────────────────────
THROTTLE_TTL=60000
THROTTLE_LIMIT=120

# ── Servicios externos ────────────────────────────────────────────────────────
SUNAT_TOKEN=""
AI_ENGINE_URL="http://localhost:8010"
UPLOADER_URL="http://localhost:3050"
DOTENV
  success ".env base creado."
fi

# ─── 11. Crear .env.example ─────────────────────────────────────────────────
cp .env .env.example 2>/dev/null || true
# Limpiar valores sensibles en example
sed -i.bak \
  -e 's|postgresql://.*|postgresql://USER:PASSWORD@HOST:5432/nm_services?schema=public|' \
  -e 's|CHANGE_ME.*|CHANGE_ME|g' \
  .env.example && rm -f .env.example.bak
success ".env.example creado."

# ─── 12. Configurar Jest global para el monorepo ────────────────────────────
cat > jest.config.js <<'JEST'
/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/apps/auth-service',
    '<rootDir>/apps/catalog-service',
    '<rootDir>/apps/inventory-service',
    '<rootDir>/apps/pos-service',
    '<rootDir>/apps/finance-service',
    '<rootDir>/apps/hr-service',
    '<rootDir>/apps/report-service',
    '<rootDir>/apps/ai-proxy-service',
    '<rootDir>/apps/gateway',
  ],
};
JEST
success "jest.config.js global configurado."

# ─── 13. Agregar scripts npm útiles ─────────────────────────────────────────
info "Agregando scripts npm al package.json raíz..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = {
  ...pkg.scripts,
  'test:auth':      'npx jest apps/auth-service --passWithNoTests',
  'test:catalog':   'npx jest apps/catalog-service --passWithNoTests',
  'test:inventory': 'npx jest apps/inventory-service --passWithNoTests',
  'test:pos':       'npx jest apps/pos-service --passWithNoTests',
  'test:finance':   'npx jest apps/finance-service --passWithNoTests',
  'test:hr':        'npx jest apps/hr-service --passWithNoTests',
  'test:all':       'npx jest --passWithNoTests',
  'test:cov':       'npx jest --coverage',
  'db:migrate':     'npx prisma migrate dev',
  'db:studio':      'npx prisma studio',
  'db:generate':    'npx prisma generate',
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
success "Scripts npm agregados."

# ─── 14. Inicializar repositorio git ─────────────────────────────────────────
if [[ -d ".git" ]]; then
  warn "Repositorio git ya existe. Saltando git init."
else
  info "Inicializando repositorio git..."
  git init
  cat > .gitignore <<'GITIGNORE'
node_modules/
dist/
.env
*.env.local
prisma/migrations/
coverage/
.DS_Store
*.log
GITIGNORE
  success "Repositorio git inicializado."
fi

# ─── Resumen final ───────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Monorepo NestJS listo en: $BASE_DIR${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  SIGUIENTES PASOS:                                           ║${NC}"
echo -e "${GREEN}║  1. cd $BASE_DIR                              ║${NC}"
echo -e "${GREEN}║  2. Editar .env con tus credenciales reales                  ║${NC}"
echo -e "${GREEN}║  3. Copiar prisma/schema.prisma del migration kit            ║${NC}"
echo -e "${GREEN}║  4. npx prisma migrate dev --name init                       ║${NC}"
echo -e "${GREEN}║  5. ./scripts/02-scaffold-auth-service.sh                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
