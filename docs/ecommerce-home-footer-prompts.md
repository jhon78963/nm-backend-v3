# Prompts — Home & Footer configurables (ecommerce-service + nm-ecommerce)

> **Proyecto:** `nm-backend-v3` · `ecommerce-service` + integración en `nm-ecommerce`  
> **Objetivo:** Hacer configurable desde el backend cada sección del home y el footer del ecommerce.  
> **Patrón a seguir:** igual que `hero-slide`, `banner`, `header` que ya existen en `apps/ecommerce-service/src/`.  
> **Reglas:** Respetar `.cursorrules` de cada proyecto. NestJS para el backend, Next.js App Router (Server Components) para el frontend.

---

## Análisis — ¿Qué debe ser configurable?

### Home (`/`) — `nm-ecommerce/src/app/page.tsx`

| Sección | Endpoint frontend actual | Contenido modificable |
|---|---|---|
| **Hero slider** | `ecommerce/hero-slides` | ✅ Ya implementado |
| **Banners (4 grid)** | `ecommerce/banners` | ✅ Ya implementado |
| **Colecciones de productos** (`Today's Deal`, etc.) | — hardcoded | ❌ Pendiente |
| **Offer Banner** | `ecommerce/banners/offer` | ✅ Ya implementado |
| **Category Products** | `ecommerce/home/category-products` | ❌ Pendiente (servicio existe, backend no) |
| **Services** | `ecommerce/home/services` | ❌ Pendiente |
| **Social Media (TikTok)** | `ecommerce/home/social-media` | ❌ Pendiente |

### Footer — `nm-ecommerce/src/features/footer/`

| Sección | Endpoint frontend actual | Contenido modificable |
|---|---|---|
| **Config completa** (newsletter, about, social, links, etc.) | `ecommerce/footer` | ❌ Pendiente (tipo definido, backend no) |

### Catálogo de productos (compartido por collections + category-products)

| Necesidad | Endpoint disponible en backend-map |
|---|---|
| Listar productos por IDs | `GET /api/v1/products` con filtros |
| Listar géneros / "categorías" para tabs | `GET /api/v1/genders` |
| Imagen cover por producto | `GET /api/v1/products/:productId/media` |

> **Nota:** El catálogo real viene de `catalog-service`. El `ecommerce-service` solo guarda **configuración** (qué IDs mostrar, orden, títulos). Los productos reales se resuelven desde el frontend llamando a `GET /api/v1/products?ids=1,2,3` con los IDs que devuelve la config.

---

## Arquitectura acordada

```
ecommerce-service (NestJS)
  ├── hero-slide/        ← ya existe
  ├── banner/            ← ya existe
  ├── header/            ← ya existe
  ├── footer/            ← PENDIENTE (prompt 1)
  ├── collections/       ← PENDIENTE (prompt 2)
  ├── category-products/ ← PENDIENTE (prompt 3)
  ├── services-section/  ← PENDIENTE (prompt 4)
  └── social-media/      ← PENDIENTE (prompt 5)

nm-ecommerce (Next.js)
  ├── GET ecommerce/footer              ← integrar con FooterService
  ├── GET ecommerce/home/collections    ← nueva sección + fetch de productos
  ├── GET ecommerce/home/category-products ← completar integración + fetch real
  ├── GET ecommerce/home/services       ← completar integración
  └── GET ecommerce/home/social-media   ← completar integración
```

---

## Prisma — Modelos nuevos necesarios

> Añadir al final de `libs/database/prisma/schema.prisma`, antes de `@@map`.
> El modelo `StoreBanner` ya existe y lo reutilizan hero-slide y banner.  
> Para las secciones del home que guardan configuración JSON estructurada se usa `StoreSection`.

```prisma
// Sección genérica de home (colecciones, category-products, services, social-media, footer)
model StoreSection {
  id        String   @id @default(uuid())
  slug      String   @unique @db.VarChar(80)
  config    Json     @default("{}")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("creation_time")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([slug, isActive])
  @@map("store_sections")
}
```

> **Por qué JSON y no columnas?** Las secciones tienen estructuras distintas y evolucionan independientemente. El patrón JSON + slug funciona igual que `hero-slide` usa `StoreBanner` con slug como discriminador.

---

---

## PROMPT 1 — Footer configurable

### Backend: `apps/ecommerce-service/src/footer/`

```
Actúa como desarrollador Senior NestJS siguiendo el patrón exacto de `apps/ecommerce-service/src/header/`.

Crea el módulo `footer` en `apps/ecommerce-service/src/footer/` con los siguientes archivos:

### 1. `footer/constants/footer.defaults.ts`
Constantes:
- `DEFAULT_FOOTER_SLUG = 'default-footer'`
- `DEFAULT_FOOTER_CACHE_KEY = 'ecommerce:footer:public'`
- `FOOTER_CACHE_TTL_SECONDS = 300`
- `DEFAULT_FOOTER_CONFIG`: objeto que implemente `PublicFooterConfig` con datos reales de Novedades Maritex:
  - newsletterTitle: "Suscríbete a nuestro newsletter"
  - newsletterSubtitle: "Recibe ofertas exclusivas y novedades cada semana"
  - aboutText: "Novedades Maritex — Tu tienda de moda favorita."
  - address: "Lima, Perú"
  - supportNumber: "+51 999 999 999"
  - supportEmail: "soporte@novedadesmaritex.com"
  - facebookUrl / tiktokUrl / instagramUrl (strings vacíos por defecto)
  - categories: array de 5 FooterCategoryItem (nombre + href slug)
  - usefulLinks / helpCenterLinks: arrays de 4 FooterLinkItem
  - copyrightEnabled: true
  - copyrightContent: "© 2026 Novedades Maritex. Todos los derechos reservados."
  - paymentImageUrl: null

### 2. `footer/dto/update-footer.dto.ts`
DTO con class-validator. Todos los campos opcionales excepto estructuras anidadas.
Los arrays de links y categories usan clases anidadas con `@ValidateNested` + `@Type`.

Interfaces a implementar en el servicio:
```typescript
interface FooterLinkItem { id?: string; name: string; href: string; }
interface FooterCategoryItem { id?: string; name: string; href: string; }
interface PublicFooterConfig {
  newsletterTitle: string;
  newsletterSubtitle: string;
  aboutText: string;
  address: string;
  supportNumber: string;
  supportEmail: string;
  socialMediaEnabled: boolean;
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  pinterestUrl?: string;
  tiktokUrl?: string;
  categories: FooterCategoryItem[];
  usefulLinks: FooterLinkItem[];
  helpCenterLinks: FooterLinkItem[];
  copyrightEnabled: boolean;
  copyrightContent: string;
  paymentImageUrl?: string;
}
```

### 3. `footer/footer-cache.service.ts`
Sigue el patrón de `header-cache.service.ts`. Usa `@app/cache` (Redis). TTL = 300s.

### 4. `footer/footer.service.ts`
- `getPublicFooter(): Promise<PublicFooterResponse>` — lee de cache, si miss lee de `StoreSection` (slug=`default-footer`), si no existe devuelve el default.
- `upsertFooter(dto): Promise<PublicFooterResponse>` — guarda JSON en `StoreSection.config`, invalida cache, devuelve nuevo estado.
- Mapea `StoreSection.config` (Json de Prisma) a `PublicFooterConfig`.

Respuesta envuelta:
```typescript
interface PublicFooterResponse { footer: PublicFooterConfig | null; }
```

### 5. `footer/footer.controller.ts`
```
GET  /ecommerce/footer         → @Public() → getPublicFooter()
PUT  /ecommerce/footer/admin   → @UseGuards(JwtAuthGuard, RolesGuard) @Roles('Admin','Super Admin') → upsertFooter(dto)
```

### 6. `footer/footer.module.ts`
NestJS module que importa `DatabaseModule` y `CacheModule` (como los otros módulos).

### 7. Registrar en `app.module.ts`
Importar `FooterModule` en `AppModule`.
```

---

### Frontend: integrar en `nm-ecommerce`

```
El servicio `src/features/footer/services/footer.service.ts` ya llama a `ecommerce/footer` con fallback.
El tipo `StoreFooterConfig` en `src/features/footer/types/footer.types.ts` ya está definido.

No hace falta cambiar nada en el frontend una vez que el backend esté levantado y respondiendo.

Verificar que el tipo `PublicFooterConfig` del backend sea idéntico a `StoreFooterConfig` del frontend.
Si hay discrepancias en nombres de campos, ajustar en `footer.types.ts` (frontend) para que coincidan.

Campos que deben coincidir exactamente (case-sensitive):
- newsletterTitle, newsletterSubtitle, aboutText, address, supportNumber, supportEmail
- socialMediaEnabled, facebookUrl, twitterUrl, instagramUrl, pinterestUrl, tiktokUrl
- categories[].id, categories[].name, categories[].href
- usefulLinks[].id, usefulLinks[].name, usefulLinks[].href
- helpCenterLinks[].id, helpCenterLinks[].name, helpCenterLinks[].href
- copyrightEnabled, copyrightContent, paymentImageUrl
```

---

---

## PROMPT 2 — Colecciones de productos (`Today's Deal`, etc.)

### Análisis del contenido actual

La sección "Today's Deal" en `nm-ecommerce/src/features/home/components/collections/` muestra:
- Un título configurado (tag + title + description)
- N productos en grid (máx. 5 en desktop, carousel en mobile)
- Los productos vienen de `FALLBACK_TODAYS_DEAL_PRODUCTS` (hardcoded)

En el futuro puede haber **múltiples colecciones** (ej: "Menos de S/20", "Recomendados", etc.).
Por eso el backend debe soportar un array de colecciones con sus IDs de productos.

### Backend: `apps/ecommerce-service/src/collections/`

```
Actúa como desarrollador Senior NestJS siguiendo el patrón de `apps/ecommerce-service/src/banner/`.

Crea el módulo `collections` en `apps/ecommerce-service/src/collections/`:

### 1. `collections/constants/collections.defaults.ts`
- `DEFAULT_COLLECTIONS_SLUG = 'home-collections'`
- `DEFAULT_COLLECTIONS_CACHE_KEY = 'ecommerce:home:collections:public'`
- `COLLECTIONS_CACHE_TTL_SECONDS = 300`
- `DEFAULT_COLLECTIONS_CONFIG`: array de 1 colección:
  ```typescript
  [{
    id: 'todays-deal',
    tag: 'oferta especial',
    title: "Today's Deal",
    description: 'Las mejores ofertas del día.',
    status: true,
    productIds: []  // vacío — el frontend usa fallback
  }]
  ```

### 2. Interfaces
```typescript
interface HomeCollectionItem {
  id: string;               // slug/id único de la colección (ej: 'todays-deal')
  tag?: string;
  title: string;
  description?: string;
  status: boolean;
  productIds: number[];     // IDs del catálogo real
}

interface PublicCollectionsResponse {
  collections: HomeCollectionItem[];
}
```

### 3. `collections/dto/update-collections.dto.ts`
DTO con array de colecciones. Cada colección: id (string), tag?, title (required), description?, status (boolean), productIds (number[]).
Usa `@IsArray()`, `@ValidateNested({ each: true })`, `@Type(() => HomeCollectionItemDto)`.

### 4. `collections/collections-cache.service.ts`
Cache Redis, TTL = 300s.

### 5. `collections/collections.service.ts`
- Guarda el array completo de colecciones como JSON en `StoreSection` (slug=`home-collections`).
- `getPublicCollections()` → cache → DB → default.
- `upsertCollections(dto)` → guarda, invalida cache, retorna.

### 6. `collections/collections.controller.ts`
```
GET /ecommerce/home/collections       → @Public() → getPublicCollections()
PUT /ecommerce/home/collections/admin → @Roles('Admin','Super Admin') → upsertCollections(dto)
```

### 7. `collections/collections.module.ts` + registrar en `app.module.ts`
```

---

### Frontend: integrar colecciones reales en `nm-ecommerce`

```
Actúa como desarrollador Senior Next.js App Router (TypeScript, Server Components).
Sigue el .cursorrules de nm-ecommerce: features/ por dominio, Server Components por defecto,
CSS externo para estilos legacy, fallback para cuando el API no responde.

### 1. Nuevo servicio: `src/features/home/services/collections.service.ts`
```typescript
// Llama a: GET /api/v1/ecommerce/home/collections
// Revalida cada 300 segundos
// Si la API falla o devuelve vacío, usa FALLBACK_TODAYS_DEAL_PRODUCTS para la primera colección

export async function getHomeCollections(): Promise<HomeCollectionView[]>
```

### 2. Nuevo tipo: `src/features/home/types/collection.types.ts` (ampliar)
Añadir:
```typescript
interface HomeCollectionView {
  id: string;
  tag?: string;
  title: string;
  description?: string;
  status: boolean;
  products: ProductBoxItem[];
}
```

### 3. Resolver productos de una colección
Cuando el backend devuelva `productIds`, hacer `GET /api/v1/products` pasando los IDs.
Mapear la respuesta del catálogo a `ProductBoxItem[]` usando un mapper en:
`src/features/product/utils/map-catalog-product.ts`

La respuesta de `GET /api/v1/products` (según backend-map.md §8) incluye:
```typescript
{
  id, name, barcode, isFeatured, isOnSale, status,
  sizes: [{ id, salePrice, stock, size, colors }]
}
```
El mapper debe:
- `slug`: usar `id` (o barcode si está disponible) como slug provisional
- `imageUrl`: llamar a `GET /api/v1/products/:id/media` para obtener la imagen cover (o usar placeholder)
- `price`: `sizes[0].salePrice` (o el precio más bajo)
- `salePrice`: igual que price si `isOnSale === false`
- `discount`: calcular % si `isOnSale === true`
- `stockStatus`: `sizes.some(s => s.stock > 0)` ? 'in_stock' : 'out_of_stock'
- `ratingCount`: null (no disponible en catalog-service)
- `reviewsCount`: 0

### 4. Actualizar `src/app/page.tsx`
Importar `getHomeCollections()` y reemplazar el `<ProductCollectionSection />` estático por
un mapeo dinámico de colecciones:
```tsx
const collections = await getHomeCollections();
// ...
{collections.map((col) => (
  <ProductCollectionSection key={col.id} config={col} products={col.products} />
))}
```

### 5. Actualizar `ProductCollectionSection` para aceptar la nueva forma de `config`
Asegurarse de que `ProductCollectionConfig` incluya `id` para el key.
```

---

---

## PROMPT 3 — Category Products (tabs + left panel)

Esta sección tiene dos paneles:
- **Izquierdo**: "Menos de S/ 20" — lista vertical de productos de un precio máximo o IDs fijos.
- **Derecho**: tabs por género/categoría ("RECOMENDACIONES PARA TI") + banner lateral.

### Backend: `apps/ecommerce-service/src/category-products/`

```
Actúa como desarrollador Senior NestJS siguiendo el patrón de `apps/ecommerce-service/src/banner/`.

Crea el módulo `category-products`:

### 1. Interfaces del dominio
```typescript
interface HomeLeftPanelConfig {
  title: string;           // "Menos de S/ 20"
  status: boolean;
  productIds: number[];    // IDs a mostrar (del catálogo)
}

interface HomeCategoryTabConfig {
  id: string;              // genderId del catalog-service
  name: string;            // label visual del tab
  productIds: number[];    // IDs a mostrar en este tab
}

interface HomeCategoryProductSectionConfig {
  status: boolean;
  leftPanel: HomeLeftPanelConfig;
  rightPanel: {
    title: string;                            // "RECOMENDACIONES PARA TI"
    tabs: HomeCategoryTabConfig[];            // 1..N tabs
    bannerImageUrl?: string;
    bannerHref?: string;
    bannerStatus: boolean;
  };
}

interface PublicCategoryProductResponse {
  section: HomeCategoryProductSectionConfig | null;
}
```

### 2. `category-products/constants/category-products.defaults.ts`
- `DEFAULT_CATEGORY_PRODUCTS_SLUG = 'home-category-products'`
- Default config con leftPanel.title = "Menos de S/ 20", tabs vacíos, bannerStatus = false.

### 3. DTO: `update-category-products.dto.ts`
Anidado: `leftPanel` (title, status, productIds[]), `rightPanel` (title, tabs[], bannerImageUrl?, bannerHref?, bannerStatus).
Cada tab: `{ id: string, name: string, productIds: number[] }`.

### 4. `category-products.service.ts`
- Guarda en `StoreSection` con slug `home-category-products`.
- `getPublicCategoryProducts()` → cache → DB → default.
- `upsertCategoryProducts(dto)` → guarda, invalida cache, retorna.

### 5. `category-products.controller.ts`
```
GET /ecommerce/home/category-products       → @Public() → getPublicCategoryProducts()
PUT /ecommerce/home/category-products/admin → @Roles('Admin','Super Admin') → upsert
```

### 6. Módulo + registrar en app.module.ts
```

---

### Frontend: completar integración real

```
El servicio `src/features/home/services/category-product.service.ts` ya existe y llama al endpoint.
Actualmente `buildFallbackCategoryProductSection()` siempre se usa.

### Objetivo: resolver productos reales una vez el backend devuelva IDs.

### 1. Crear `src/features/product/services/catalog.service.ts`
Servicio que llama a `GET /api/v1/products` (backend-map §8):
```typescript
export async function getProductsByIds(ids: number[]): Promise<ProductBoxItem[]>
```
- Si ids vacío → devuelve [].
- Llama con `?ids=1,2,3` (o el param que soporte el backend).
- Usa `map-catalog-product.ts` para transformar respuesta → ProductBoxItem[].
- Revalida cada 60 segundos (datos de producto cambian con más frecuencia).

### 2. Actualizar `category-product.service.ts`
Cuando `response.section` tenga `leftPanel.productIds` o `rightPanel.tabs[*].productIds`,
resolver los productos reales llamando a `getProductsByIds()`.
Si productIds vacíos, usar los productos del fallback.

### 3. Actualizar `src/app/page.tsx`
El servicio ya se importa y devuelve `HomeCategoryProductSectionView | null`.
No necesita cambios en page.tsx; el servicio devuelve la misma forma.
```

---

---

## PROMPT 4 — Services section (iconos de beneficios)

Esta sección muestra 3-4 bloques de "beneficio" (envío gratis, devoluciones, atención 24h, etc.).
Cada bloque tiene: imageUrl (icono), title, description.

### Backend: `apps/ecommerce-service/src/services-section/`

```
Actúa como desarrollador Senior NestJS siguiendo el patrón de `apps/ecommerce-service/src/banner/`.

Crea el módulo `services-section`:

### 1. Interfaces
```typescript
interface HomeServiceItemConfig {
  id?: string;
  imageUrl: string;
  title: string;
  description: string;
  status: boolean;
  order: number;
}

interface HomeServicesConfig {
  status: boolean;
  services: HomeServiceItemConfig[];
}

interface PublicHomeServicesResponse {
  services: HomeServicesConfig | null;
}
```

### 2. `constants/services-section.defaults.ts`
- `DEFAULT_SERVICES_SLUG = 'home-services'`
- `DEFAULT_SERVICES_CONFIG`: 3 servicios con imágenes en `/images/theme/marketplace_one/service.png`:
  - "Envío Gratuito" / "En compras mayores a S/ 99"
  - "Devoluciones" / "30 días sin preguntas"
  - "Soporte 24/7" / "Atención al cliente siempre disponible"

### 3. DTO: `update-services.dto.ts`
`status: boolean`, `services: HomeServiceItemDto[]` (imageUrl, title, description, status, order).

### 4. Service + Cache + Controller
Mismo patrón que los anteriores.
```
GET /ecommerce/home/services       → @Public()
PUT /ecommerce/home/services/admin → @Roles('Admin','Super Admin')
```

### 5. Módulo + registrar en app.module.ts
```

---

### Frontend: completar integración

```
El servicio `src/features/home/services/home-services.service.ts` ya llama al endpoint.
Actualmente cae en fallback.

Una vez el backend responda, el servicio devuelve `HomeServiceItem[]` y no necesita cambios.
Verificar que los campos de la respuesta del backend coincidan con `HomeServiceItem`:
  { imageUrl: string, title: string, description: string, status?: boolean }

Si el backend devuelve campos con distinto nombre, añadir un mapper en el servicio existente.
```

---

---

## PROMPT 5 — Social Media (TikTok / Instagram)

Esta sección muestra una grilla de imágenes (6 banners) con título y link a red social.

### Backend: `apps/ecommerce-service/src/social-media/`

```
Actúa como desarrollador Senior NestJS siguiendo el patrón de `apps/ecommerce-service/src/banner/`.

Crea el módulo `social-media`:

### 1. Interfaces
```typescript
interface SocialMediaBannerConfig {
  id?: string;
  imageUrl: string;
  href?: string;
  status: boolean;
  order: number;
}

interface HomeSocialMediaConfig {
  status: boolean;
  title: string;             // "# TIKTOK" o "# INSTAGRAM"
  subtitle?: string;
  networkUrl?: string;       // link al perfil de la red social
  banners: SocialMediaBannerConfig[];
}

interface PublicHomeSocialMediaResponse {
  socialMedia: HomeSocialMediaConfig | null;
}
```

### 2. `constants/social-media.defaults.ts`
- `DEFAULT_SOCIAL_MEDIA_SLUG = 'home-social-media'`
- Default config: status=true, title="# TIKTOK", banners vacíos (frontend usa placeholders).

### 3. DTO: `update-social-media.dto.ts`
`status: boolean`, `title: string`, `subtitle?: string`, `networkUrl?: string`,
`banners: SocialMediaBannerDto[]` (imageUrl, href?, status, order).

### 4. Service + Cache + Controller
```
GET /ecommerce/home/social-media       → @Public()
PUT /ecommerce/home/social-media/admin → @Roles('Admin','Super Admin')
```

### 5. Módulo + registrar en app.module.ts
```

---

### Frontend: completar integración

```
El servicio `src/features/home/services/home-social-media.service.ts` ya llama al endpoint.
Actualmente cae en fallback.

Verificar que los campos coincidan con `HomeSocialMediaConfig`:
  { status: boolean, title: string, subtitle?: string, networkUrl?: string,
    banners: [{ imageUrl, href?, status?, order }] }
```

---

---

## PROMPT 6 — Resolver productos reales del catálogo (shared)

> Este prompt es **transversal** a colecciones, category-products y cualquier sección que muestre `ProductBox`.

```
Actúa como desarrollador Senior Next.js App Router. Sigue el .cursorrules de nm-ecommerce.

### 1. Mapper: `src/features/product/utils/map-catalog-product.ts`

Recibe la respuesta de `GET /api/v1/products` (backend-map §8) y devuelve `ProductBoxItem`.

Respuesta de la API:
```typescript
interface CatalogProduct {
  id: string;
  name: string;
  barcode?: string;
  isFeatured?: boolean;
  isOnSale?: boolean;
  status?: string;
  sizes?: Array<{
    id: string;
    salePrice: number;
    stock: number;
    size?: { id: string; description: string };
    colors?: Array<{ id: string; description: string }>;
  }>;
}
```

Reglas de mapeo:
- `id`: `product.id`
- `slug`: `product.barcode ?? product.id` (hasta tener slugs reales)
- `name`: `product.name`
- `imageUrl`: parámetro externo (se pasa junto al producto) o `/placeholder-product.svg`
- `galleryImageUrls`: parámetro externo o `[imageUrl]`
- `price`: `Math.max(...sizes.map(s => s.salePrice), 0)` — precio original (sin descuento)
- `salePrice`: `Math.min(...sizes.map(s => s.salePrice), price)` — precio más bajo
- `discount`: `isOnSale ? Math.round(((price - salePrice) / price) * 100) : 0`
- `ratingCount`: `null`
- `reviewsCount`: `0`
- `stockStatus`: `sizes.some(s => s.stock > 0)` → `'in_stock'` : `'out_of_stock'`

### 2. Servicio HTTP al catálogo: `src/features/product/services/catalog.service.ts`

```typescript
// Llama a GET /api/v1/products (requiere JWT — usar token de servicio o endpoint público futuro)
// Por ahora: si no hay auth disponible en Server Component, devuelve [] y usa fallback
export async function getProductsByIds(ids: Array<string | number>): Promise<ProductBoxItem[]>
```

IMPORTANTE: `GET /api/v1/products` requiere JWT + WarehouseGuard (backend-map §8).
Hasta que el backend tenga un endpoint público de catálogo para el ecommerce (sin auth),
este servicio devuelve `[]` y el frontend usa los fallbacks.

### 3. Endpoint público de catálogo (solicitud al backend)
Pedir al equipo backend añadir:
```
GET /api/v1/ecommerce/products/public?ids=1,2,3&warehouseId=uuid
```
- @Public() — sin JWT
- Retorna solo campos necesarios para ProductBox: id, name, salePrice, stock, mediaUrl
- El `warehouseId` puede ser el del tenant activo (header `x-tenant-id`)
- Así el frontend puede resolver productos directamente sin exponer el JWT.

(Ver sección siguiente para el prompt de este endpoint en el backend.)
```

---

---

## PROMPT 7 — Endpoint público de productos para el ecommerce

> **Requiere** añadir al módulo `catalog-service` (o un nuevo módulo en `ecommerce-service` que proxee).

```
Actúa como desarrollador Senior NestJS.

Añade un endpoint público al `catalog-service` (o crea un módulo `ecommerce-products` en `ecommerce-service`):

### `GET /api/v1/ecommerce/products/public`

**Auth:** @Public() — sin JWT  
**Guard:** ninguno (o ThrottleGuard para rate limiting)

**Query Params:**
| Param | Tipo | Descripción |
|---|---|---|
| `ids` | string | Requerido — IDs separados por coma: `1,2,3` |
| `warehouseId` | string (UUID) | Requerido — almacén del tenant |

**Respuesta `200`:**
```typescript
interface PublicProductItem {
  id: string;
  name: string;
  slug: string;           // barcode ?? id
  imageUrl: string;       // URL del cover (storage-service)
  galleryImageUrls: string[];
  price: number;          // precio más alto de tallas
  salePrice: number;      // precio más bajo de tallas
  discount: number;       // % calculado
  stockStatus: 'in_stock' | 'out_of_stock';
  ratingCount: null;
  reviewsCount: number;
}

interface PublicProductsResponse {
  products: PublicProductItem[];
}
```

**Implementación:**
1. Recibir `ids` como string, parsear a array de UUIDs/numbers.
2. `db.product.findMany({ where: { id: { in: ids }, status: 'active' }, include: { sizes: { include: { colors: true } }, media: { where: { isCover: true }, take: 1 } } })`
3. Para `imageUrl`: `storage-service` sirve en `GET /api/v1/storage/files/products/:filename`. Construir URL completa.
4. Calcular price/salePrice/discount desde `sizes`.
5. `stockStatus`: `sizes.some(s => s.stock > 0 || s.colors.some(c => c.stock > 0))`.
6. Registrar en `app.module.ts` del ecommerce-service y exponer a través del gateway.
7. Añadir rate limit: 30 req/min por IP.

**Notas de seguridad:**
- No exponer purchasePrice ni datos financieros.
- Filtrar solo productos con `status = 'active'` y `wooStatus = 'publish'`.
```

---

---

## PROMPT 8 — Migración Prisma

```
Actúa como desarrollador Senior NestJS con Prisma ORM.

Añade el modelo `StoreSection` al schema Prisma en `libs/database/prisma/schema.prisma`:

```prisma
model StoreSection {
  id        String   @id @default(uuid())
  slug      String   @unique @db.VarChar(80)
  config    Json     @default("{}")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("creation_time")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([slug, isActive])
  @@map("store_sections")
}
```

Luego genera y aplica la migración:
```bash
cd nm-backend-v3
npx prisma migrate dev --name add_store_section_and_public_products --schema libs/database/prisma/schema.prisma
```

Verifica que `DatabaseService` (en `libs/database/src/`) re-exponga `storeSection` desde el cliente Prisma generado.
Si el cliente Prisma ya se genera en `libs/database/prisma/client/`, basta con regenerar:
```bash
npx prisma generate --schema libs/database/prisma/schema.prisma
```
```

---

---

## Orden de ejecución sugerido

1. **PROMPT 8** — Migración Prisma (modelo `StoreSection`)
2. **PROMPT 1** — Footer (el más sencillo, una sola config JSON)
3. **PROMPT 4** — Services section
4. **PROMPT 5** — Social Media
5. **PROMPT 7** — Endpoint público de productos (desbloquea los demás)
6. **PROMPT 6** — Mapper y servicio de catálogo en frontend
7. **PROMPT 2** — Colecciones (depende de PROMPT 6 y 7)
8. **PROMPT 3** — Category Products (depende de PROMPT 6 y 7)

---

## Contratos de API — Resumen

| Endpoint | Auth | Descripción |
|---|---|---|
| `GET /api/v1/ecommerce/footer` | 🔓 | Config completa del footer |
| `PUT /api/v1/ecommerce/footer/admin` | 🛡️ Admin | Actualizar footer |
| `GET /api/v1/ecommerce/home/collections` | 🔓 | Colecciones del home (config + IDs) |
| `PUT /api/v1/ecommerce/home/collections/admin` | 🛡️ Admin | Actualizar colecciones |
| `GET /api/v1/ecommerce/home/category-products` | 🔓 | Left panel + tabs config |
| `PUT /api/v1/ecommerce/home/category-products/admin` | 🛡️ Admin | Actualizar |
| `GET /api/v1/ecommerce/home/services` | 🔓 | Servicios/beneficios |
| `PUT /api/v1/ecommerce/home/services/admin` | 🛡️ Admin | Actualizar |
| `GET /api/v1/ecommerce/home/social-media` | 🔓 | Configuración TikTok/Instagram |
| `PUT /api/v1/ecommerce/home/social-media/admin` | 🛡️ Admin | Actualizar |
| `GET /api/v1/ecommerce/products/public?ids=&warehouseId=` | 🔓 | Productos para ProductBox |

---

## Frontend — Endpoints ya consumidos y que no cambian

Estos ya funcionan y tienen fallback. Solo requieren que el backend esté activo:

| Servicio frontend | Endpoint | Estado |
|---|---|---|
| `hero.service.ts` | `ecommerce/hero-slides` | ✅ Backend implementado |
| `banner.service.ts` | `ecommerce/banners` | ✅ Backend implementado |
| `offer-banner.service.ts` | `ecommerce/banners/offer` | ✅ Backend implementado |
| `footer.service.ts` | `ecommerce/footer` | ⏳ Falta backend (PROMPT 1) |
| `collections.service.ts` | `ecommerce/home/collections` | ⏳ Falta todo (PROMPT 2) |
| `category-product.service.ts` | `ecommerce/home/category-products` | ⏳ Falta backend (PROMPT 3) |
| `home-services.service.ts` | `ecommerce/home/services` | ⏳ Falta backend (PROMPT 4) |
| `home-social-media.service.ts` | `ecommerce/home/social-media` | ⏳ Falta backend (PROMPT 5) |
