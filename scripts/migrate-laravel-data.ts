// =============================================================================
// ETL Script: nm_db (Laravel/PostgreSQL) → nm_services (NestJS/Prisma)
// =============================================================================
// Ejecutar:  npx ts-node --project tsconfig.migration.json scripts/migrate-laravel-data.ts
// Requiere:  pg, uuid, dotenv  (ver instrucciones al final del archivo)
// =============================================================================

import { Client, QueryResult } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

// ─── Conexiones ───────────────────────────────────────────────────────────────

const srcConfig = {
  host:     process.env.SRC_DB_HOST     ?? 'localhost',
  port:     Number(process.env.SRC_DB_PORT ?? 5432),
  database: process.env.SRC_DB_NAME     ?? 'nm_db',
  user:     process.env.SRC_DB_USER     ?? 'postgres',
  password: process.env.SRC_DB_PASSWORD ?? 'postgres',
};

const dstConfig = {
  host:     process.env.DST_DB_HOST     ?? 'localhost',
  port:     Number(process.env.DST_DB_PORT ?? 5433),
  database: process.env.DST_DB_NAME     ?? 'nm_services',
  user:     process.env.DST_DB_USER     ?? 'postgres',
  password: process.env.DST_DB_PASSWORD ?? 'postgres',
};

// ─── Namespaces UUID v5 (fijos, uno por entidad) ──────────────────────────────
// Derivados del namespace OID estándar para garantizar colisiones cero entre tablas

const NS = {
  TENANT:        'a0000001-0000-5000-8000-000000000000',
  WAREHOUSE:     'a0000002-0000-5000-8000-000000000000',
  GENDER:        'a0000003-0000-5000-8000-000000000000',
  COLOR:         'a0000004-0000-5000-8000-000000000000',
  SIZE_TYPE:     'a0000005-0000-5000-8000-000000000000',
  SIZE:          'a0000006-0000-5000-8000-000000000000',
  USER:          'a0000007-0000-5000-8000-000000000000',
  ROLE:          'a0000008-0000-5000-8000-000000000000',
  VENDOR:        'a0000009-0000-5000-8000-000000000000',
  CUSTOMER:      'a000000a-0000-5000-8000-000000000000',
  PRODUCT:       'a000000b-0000-5000-8000-000000000000',
  PRODUCT_SIZE:  'a000000c-0000-5000-8000-000000000000',
  PRODUCT_SIZE_COLOR: 'a000000d-0000-5000-8000-000000000000',
  INV_BALANCE:   'a000000e-0000-5000-8000-000000000000',
  PURCHASE:      'a000000f-0000-5000-8000-000000000000',
  PUR_LINE:      'a0000010-0000-5000-8000-000000000000',
  PUR_LINE_CD:   'a0000011-0000-5000-8000-000000000000',
  SALE:          'a0000012-0000-5000-8000-000000000000',
  SALE_DETAIL:   'a0000013-0000-5000-8000-000000000000',
  SALE_PAYMENT:  'a0000014-0000-5000-8000-000000000000',
  CASH_MOVEMENT: 'a0000015-0000-5000-8000-000000000000',
  TEAM:          'a0000016-0000-5000-8000-000000000000',
  ATTENDANCE:    'a0000017-0000-5000-8000-000000000000',
  TEAM_PAYMENT:  'a0000018-0000-5000-8000-000000000000',
} as const;

// ─── Mapas de IDs en memoria ──────────────────────────────────────────────────

const idMap = {
  tenants:       new Map<string, string>(),
  warehouses:    new Map<string, string>(),
  genders:       new Map<string, string>(),
  colors:        new Map<string, string>(),
  sizeTypes:     new Map<string, string>(),
  sizes:         new Map<string, string>(),
  users:         new Map<string, string>(),
  roles:         new Map<string, string>(),
  vendors:       new Map<string, string>(),
  customers:     new Map<string, string>(),
  products:      new Map<string, string>(),
  productSizes:  new Map<string, string>(),
  purchases:     new Map<string, string>(),
  purchaseLines: new Map<string, string>(),
  sales:         new Map<string, string>(),
  cashMovements: new Map<string, string>(),
  teams:         new Map<string, string>(),
};

/** Lookup product_size UUID por par (product_id, size_id) — usado en sale_details */
const productSizeByProductAndSize = new Map<string, string>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toUUID(namespace: string, legacyId: string | number): string {
  return uuidv5(String(legacyId), namespace);
}

function mapId(
  map: Map<string, string>,
  legacyId: string | number | null | undefined,
): string | null {
  if (legacyId == null) return null;
  return map.get(String(legacyId)) ?? null;
}

/** Soft-delete del patrón Laravel/Audit (is_deleted + deletion_time) */
function laravelAudit(row: {
  is_deleted?: boolean | null;
  deletion_time?: Date | null;
}): { isDeleted: boolean; deletionTime: Date | null } {
  return {
    isDeleted: row.is_deleted ?? false,
    deletionTime: row.deletion_time ?? null,
  };
}

/** Normaliza enums de documentType: TICKET_INTERNO → TICKET */
function normalizeDocumentType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.trim().toUpperCase() === 'TICKET_INTERNO') return 'TICKET';
  return raw.trim().toUpperCase();
}

/** Extrae mes contable 'YYYY-MM' de un Date */
function accountingMonth(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

let step = 0;
function log(msg: string): void {
  step++;
  console.log(`\n[${String(step).padStart(2, '0')}] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`     ⚠  ${msg}`);
}

function truncate(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  return value.length > max ? value.slice(0, max) : value;
}

function defaultTenantId(): string {
  const first = idMap.tenants.values().next().value as string | undefined;
  if (!first) throw new Error('No hay tenants mapeados para usar como fallback');
  return first;
}

/** Combina date + time (Laravel) en un timestamp para Prisma */
function combineDateAndTime(
  date: Date | string | null,
  time: string | Date | null,
): Date | null {
  if (!date || !time) return null;
  const datePart =
    typeof date === 'string'
      ? date.slice(0, 10)
      : date.toISOString().slice(0, 10);
  const timePart =
    typeof time === 'string'
      ? time
      : time.toISOString().slice(11, 19);
  return new Date(`${datePart}T${timePart}`);
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const res = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName],
  );
  return res.rows[0].exists;
}

// ─── Función principal ────────────────────────────────────────────────────────

async function migrate(): Promise<void> {
  const src = new Client(srcConfig);
  const dst = new Client(dstConfig);

  console.log('========================================================');
  console.log('  ETL: nm_db (Laravel)  →  nm_services (NestJS/Prisma)');
  console.log('========================================================');

  try {
    await src.connect();
    console.log(`✔  Conectado a origen:  ${srcConfig.database}@${srcConfig.host}:${srcConfig.port}`);

    await dst.connect();
    console.log(`✔  Conectado a destino: ${dstConfig.database}@${dstConfig.host}:${dstConfig.port}`);

    // Toda la migración en una sola transacción en destino
    await dst.query('BEGIN');

    // Temporalmente deshabilitar triggers de FK para carga masiva
    await dst.query('SET session_replication_role = replica');

    // ── 1. tenants ─────────────────────────────────────────────────────────────
    log('Migrando: tenants');
    {
      const { rows } = await src.query(
        `SELECT id, name, is_active, created_at FROM tenants ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.TENANT, r.id);
        idMap.tenants.set(String(r.id), newId);
        await dst.query(
          `INSERT INTO tenants (id, name, is_active, creation_time)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.name, r.is_active ?? true, r.created_at ?? new Date()],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 2. warehouses ──────────────────────────────────────────────────────────
    log('Migrando: warehouses');
    {
      const { rows } = await src.query(
        `SELECT id, name, tenant_id, catalog_public_token, is_deleted
         FROM warehouses ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.WAREHOUSE, r.id);
        idMap.warehouses.set(String(r.id), newId);
        const tenantUUID = mapId(idMap.tenants, r.tenant_id);
        if (!tenantUUID) { warn(`warehouse ${r.id}: tenant_id ${r.tenant_id} no mapeado, omitido`); continue; }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO warehouses (id, name, tenant_id, catalog_public_token, is_deleted)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.name, tenantUUID, r.catalog_public_token ?? null, isDeleted],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 3a. genders ────────────────────────────────────────────────────────────
    log('Migrando: genders');
    {
      const { rows } = await src.query(
        `SELECT id, name, short_name FROM genders ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.GENDER, r.id);
        idMap.genders.set(String(r.id), newId);
        await dst.query(
          `INSERT INTO genders (id, name, short_name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.name, r.short_name ?? null],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 3b. colors ─────────────────────────────────────────────────────────────
    log('Migrando: colors');
    {
      const { rows } = await src.query(
        `SELECT id, description, hash, is_deleted, deletion_time FROM colors ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.COLOR, r.id);
        idMap.colors.set(String(r.id), newId);
        const { isDeleted, deletionTime } = laravelAudit(r);
        await dst.query(
          `INSERT INTO colors (id, description, hash, is_deleted, deletion_time)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.description, r.hash ?? null, isDeleted, deletionTime],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 3c. size_types ─────────────────────────────────────────────────────────
    log('Migrando: size_types');
    {
      const exists = await tableExists(src, 'size_types');
      if (exists) {
        const { rows } = await src.query(
          `SELECT id, description FROM size_types ORDER BY id`,
        );
        for (const r of rows) {
          const newId = toUUID(NS.SIZE_TYPE, r.id);
          idMap.sizeTypes.set(String(r.id), newId);
          await dst.query(
            `INSERT INTO size_types (id, description)
             VALUES ($1, $2)
             ON CONFLICT (id) DO NOTHING`,
            [newId, r.description],
          );
        }
        console.log(`     → ${rows.length} registros`);
      } else {
        warn('Tabla size_types no encontrada en origen, omitida');
      }
    }

    // ── 3d. sizes ──────────────────────────────────────────────────────────────
    log('Migrando: sizes');
    {
      const { rows } = await src.query(
        `SELECT id, description, size_type_id, is_deleted FROM sizes ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.SIZE, r.id);
        idMap.sizes.set(String(r.id), newId);
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO sizes (id, description, size_type_id, is_deleted)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.description, mapId(idMap.sizeTypes, r.size_type_id), isDeleted],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 4a. roles ──────────────────────────────────────────────────────────────
    log('Migrando: roles');
    {
      const { rows } = await src.query(
        `SELECT id, name, guard_name, tenant_id FROM roles ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.ROLE, r.id);
        idMap.roles.set(String(r.id), newId);
        await dst.query(
          `INSERT INTO roles (id, name, guard_name, tenant_id, is_system)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            r.name,
            r.guard_name ?? 'api',
            mapId(idMap.tenants, r.tenant_id),
            false,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 4b. users ──────────────────────────────────────────────────────────────
    log('Migrando: users');
    {
      // Intentamos varios nombres de columna comunes en proyectos Laravel
      const { rows } = await src.query(
        `SELECT
           id,
           username,
           email,
           password,
           name,
           surname,
           phone,
           profile_picture,
           COALESCE(must_change_password, false) AS must_change_password,
           tenant_id,
           warehouse_id,
           is_deleted,
           deletion_time,
           creation_time,
           COALESCE(last_modification_time, creation_time) AS updated_at
         FROM users
         ORDER BY id`,
      );
      // Primer pasada: mapear IDs sin resolver creator (puede auto-referenciar)
      for (const r of rows) {
        const newId = toUUID(NS.USER, r.id);
        idMap.users.set(String(r.id), newId);
      }
      // Segunda pasada: insertar con referencias ya resueltas
      for (const r of rows) {
        const newId = idMap.users.get(String(r.id))!;
        const tenantUUID = mapId(idMap.tenants, r.tenant_id) ?? defaultTenantId();
        if (!mapId(idMap.tenants, r.tenant_id)) {
          warn(`user ${r.id}: tenant_id null, asignado tenant por defecto`);
        }
        const { isDeleted, deletionTime } = laravelAudit(r);
        await dst.query(
          `INSERT INTO users (
             id, username, email, password_hash, name, surname, phone,
             profile_picture, must_change_password, is_enabled,
             tenant_id, warehouse_id, is_deleted, deletion_time,
             creation_time, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            r.username,
            r.email,
            r.password,
            r.name,
            r.surname,
            truncate(r.phone, 20),
            r.profile_picture ?? null,
            r.must_change_password,
            true,
            tenantUUID,
            mapId(idMap.warehouses, r.warehouse_id),
            isDeleted,
            deletionTime,
            r.creation_time,
            r.updated_at,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 4c. user_roles (Spatie: model_has_roles) ───────────────────────────────
    log('Migrando: user_roles');
    {
      // Spatie Permission usa model_has_roles con model_type + model_id
      const spatie = await tableExists(src, 'model_has_roles');
      let roleRows: Array<{ model_id: string | number; role_id: string | number }> = [];

      if (spatie) {
        const res = await src.query(
          `SELECT model_id, role_id FROM model_has_roles
           WHERE model_type ILIKE '%user%'`,
        );
        roleRows = res.rows;
      } else {
        // Tabla pivote directa
        const fallback = await tableExists(src, 'user_roles');
        if (fallback) {
          const res = await src.query(`SELECT user_id AS model_id, role_id FROM user_roles`);
          roleRows = res.rows;
        }
      }

      let inserted = 0;
      for (const r of roleRows) {
        const userUUID = mapId(idMap.users, r.model_id);
        const roleUUID = mapId(idMap.roles, r.role_id);
        if (!userUUID || !roleUUID) continue;
        await dst.query(
          `INSERT INTO user_roles (user_id, role_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [userUUID, roleUUID],
        );
        inserted++;
      }
      console.log(`     → ${inserted} registros`);
    }

    // ── 5. vendors ─────────────────────────────────────────────────────────────
    log('Migrando: vendors');
    {
      const { rows } = await src.query(
        `SELECT id, name, address, local, phone, COALESCE(balance, 0) AS balance,
                warehouse_id, is_deleted
         FROM vendors ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.VENDOR, r.id);
        idMap.vendors.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        if (!warehouseUUID) { warn(`vendor ${r.id}: warehouse sin mapeo, omitido`); continue; }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO vendors (id, name, address, local, phone, balance, warehouse_id, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.name, r.address ?? null, r.local ?? null, truncate(r.phone, 20), r.balance, warehouseUUID, isDeleted],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 6. customers ───────────────────────────────────────────────────────────
    log('Migrando: customers');
    {
      const { rows } = await src.query(
        `SELECT id, document_type, document_number, name, warehouse_id, is_deleted
         FROM customers ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.CUSTOMER, r.id);
        idMap.customers.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        if (!warehouseUUID) { warn(`customer ${r.id}: warehouse sin mapeo, omitido`); continue; }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO customers (id, document_type, document_number, name, warehouse_id, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [newId, r.document_type ?? null, r.document_number ?? null, r.name, warehouseUUID, isDeleted],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 7. products ────────────────────────────────────────────────────────────
    log('Migrando: products');
    {
      const { rows } = await src.query(
        `SELECT
           id, name, description, barcode,
           percentage_discount, cash_discount,
           COALESCE(is_featured, false) AS is_featured,
           COALESCE(is_on_sale, false)  AS is_on_sale,
           COALESCE(woo_status, 'draft') AS woo_status,
           COALESCE(status, 'active')   AS status,
           gender_id, vendor_id, warehouse_id,
           is_deleted, deletion_time,
           creation_time,
           COALESCE(last_modification_time, creation_time) AS updated_at,
           creator_user_id,
           last_modifier_user_id AS updater_user_id,
           deleter_user_id
         FROM products ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.PRODUCT, r.id);
        idMap.products.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        const genderUUID    = mapId(idMap.genders, r.gender_id);
        if (!warehouseUUID || !genderUUID) {
          warn(`product ${r.id}: FK faltante (warehouse/gender), omitido`);
          continue;
        }
        const { isDeleted, deletionTime } = laravelAudit(r);
        await dst.query(
          `INSERT INTO products (
             id, name, description, barcode, percentage_discount, cash_discount,
             is_featured, is_on_sale,
             woo_status, status, gender_id, vendor_id, warehouse_id,
             is_deleted, deletion_time, created_by_id, updated_by_id,
             deleted_by_id, creation_time, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            r.name,
            r.description ?? null,
            r.barcode ?? null,
            r.percentage_discount ?? null,
            r.cash_discount ?? null,
            r.is_featured,
            r.is_on_sale,
            r.woo_status,
            r.status,
            genderUUID,
            mapId(idMap.vendors, r.vendor_id),
            warehouseUUID,
            isDeleted,
            deletionTime,
            mapId(idMap.users, r.creator_user_id),
            mapId(idMap.users, r.updater_user_id),
            mapId(idMap.users, r.deleter_user_id),
            r.creation_time,
            r.updated_at,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 8. product_size ────────────────────────────────────────────────────────
    log('Migrando: product_size');
    {
      const { rows } = await src.query(
        `SELECT
           id, product_id, size_id, barcode,
           purchase_price, sale_price, min_sale_price
         FROM product_size ORDER BY id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.PRODUCT_SIZE, r.id);
        idMap.productSizes.set(String(r.id), newId);
        productSizeByProductAndSize.set(`${r.product_id}:${r.size_id}`, newId);
        const productUUID = mapId(idMap.products, r.product_id);
        const sizeUUID    = mapId(idMap.sizes, r.size_id);
        if (!productUUID || !sizeUUID) {
          warn(`product_size ${r.id}: FK faltante, omitido`);
          continue;
        }
        await dst.query(
          `INSERT INTO product_size (
             id, product_id, size_id, barcode,
             purchase_price, sale_price, min_sale_price,
             is_deleted, deletion_time
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            productUUID,
            sizeUUID,
            r.barcode ?? null,
            r.purchase_price ?? 0,
            r.sale_price ?? 0,
            r.min_sale_price ?? null,
            false,
            null,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 9. product_size_color ──────────────────────────────────────────────────
    log('Migrando: product_size_color');
    {
      const { rows } = await src.query(
        `SELECT product_size_id, color_id FROM product_size_color ORDER BY product_size_id, color_id`,
      );
      for (const r of rows) {
        const newId = toUUID(NS.PRODUCT_SIZE_COLOR, `${r.product_size_id}:${r.color_id}`);
        const productSizeUUID = mapId(idMap.productSizes, r.product_size_id);
        const colorUUID       = mapId(idMap.colors, r.color_id);
        if (!productSizeUUID || !colorUUID) continue;
        await dst.query(
          `INSERT INTO product_size_color (id, product_size_id, color_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_size_id, color_id) DO NOTHING`,
          [newId, productSizeUUID, colorUUID],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 10. inventory_balances ─────────────────────────────────────────────────
    log('Migrando: inventory_balances');
    {
      const { rows } = await src.query(
        `SELECT id, warehouse_id, product_size_id, color_id,
                COALESCE(quantity, 0) AS quantity
         FROM inventory_balances ORDER BY id`,
      );
      for (const r of rows) {
        const newId           = toUUID(NS.INV_BALANCE, r.id);
        const warehouseUUID   = mapId(idMap.warehouses, r.warehouse_id);
        const productSizeUUID = mapId(idMap.productSizes, r.product_size_id);
        const colorUUID       = mapId(idMap.colors, r.color_id);
        if (!warehouseUUID || !productSizeUUID || !colorUUID) continue;
        await dst.query(
          `INSERT INTO inventory_balances (id, warehouse_id, product_size_id, color_id, quantity)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (warehouse_id, product_size_id, color_id) DO NOTHING`,
          [newId, warehouseUUID, productSizeUUID, colorUUID, r.quantity],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 11. purchases ──────────────────────────────────────────────────────────
    log('Migrando: purchases');
    {
      const { rows } = await src.query(
        `SELECT
           id, warehouse_id, vendor_id, supplier_name,
           COALESCE(currency, 'PEN') AS currency,
           total_subtotal AS total_amount,
           COALESCE(status, 'REGISTERED') AS status,
           document_note AS notes,
           registered_at AS purchase_date,
           cancellation_reason AS cancel_reason,
           cancellation_user_id AS cancelled_by_id,
           cancelled_at,
           is_deleted,
           creator_user_id,
           creation_time
         FROM purchases ORDER BY id`,
      );
      for (const r of rows) {
        const newId       = toUUID(NS.PURCHASE, r.id);
        idMap.purchases.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        const creatorUUID   = mapId(idMap.users, r.creator_user_id);
        if (!warehouseUUID || !creatorUUID) {
          warn(`purchase ${r.id}: FK faltante, omitido`);
          continue;
        }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO purchases (
             id, warehouse_id, vendor_id, supplier_name, currency,
             exchange_rate, total_amount, status, notes, purchase_date,
             cancel_reason, cancelled_by_id, cancelled_at,
             is_deleted, created_by_id, creation_time
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            warehouseUUID,
            mapId(idMap.vendors, r.vendor_id),
            r.supplier_name ?? null,
            r.currency,
            null,
            r.total_amount,
            r.status,
            r.notes ?? null,
            r.purchase_date,
            r.cancel_reason ?? null,
            mapId(idMap.users, r.cancelled_by_id),
            r.cancelled_at ?? null,
            isDeleted,
            creatorUUID,
            r.creation_time,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 11b. purchase_lines ────────────────────────────────────────────────────
    log('Migrando: purchase_lines');
    {
      const { rows } = await src.query(
        `SELECT
           id, purchase_id, product_id, size_id, product_size_id,
           purchase_price, sale_price,
           COALESCE(size_stock_delta, 0) AS quantity,
           COALESCE(has_color_breakdown, false) AS has_color_breakdown
         FROM purchase_lines ORDER BY id`,
      );
      for (const r of rows) {
        const newId         = toUUID(NS.PUR_LINE, r.id);
        idMap.purchaseLines.set(String(r.id), newId);
        const purchaseUUID   = mapId(idMap.purchases, r.purchase_id);
        const productSizeUUID = mapId(idMap.productSizes, r.product_size_id);
        if (!purchaseUUID || !productSizeUUID) continue;
        await dst.query(
          `INSERT INTO purchase_lines (
             id, purchase_id, product_id, size_id, product_size_id,
             purchase_price, sale_price, quantity, has_color_breakdown
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            purchaseUUID,
            mapId(idMap.products, r.product_id),
            mapId(idMap.sizes, r.size_id),
            productSizeUUID,
            r.purchase_price,
            r.sale_price ?? null,
            r.quantity,
            r.has_color_breakdown,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 11c. purchase_line_color_deltas ────────────────────────────────────────
    log('Migrando: purchase_line_color_deltas');
    {
      const tableName = (await tableExists(src, 'purchase_line_color_deltas'))
        ? 'purchase_line_color_deltas'
        : (await tableExists(src, 'purchase_line_colors'))
          ? 'purchase_line_colors'
          : null;

      if (tableName) {
        const { rows } = await src.query(
          `SELECT id, purchase_line_id, color_id, quantity FROM ${tableName} ORDER BY id`,
        );
        for (const r of rows) {
          const newId          = toUUID(NS.PUR_LINE_CD, r.id);
          const purLineUUID    = mapId(idMap.purchaseLines, r.purchase_line_id);
          const colorUUID      = mapId(idMap.colors, r.color_id);
          if (!purLineUUID || !colorUUID) continue;
          await dst.query(
            `INSERT INTO purchase_line_color_deltas (id, purchase_line_id, color_id, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [newId, purLineUUID, colorUUID, r.quantity],
          );
        }
        console.log(`     → ${rows.length} registros`);
      } else {
        warn('Tabla purchase_line_color_deltas / purchase_line_colors no encontrada, omitida');
      }
    }

    // ── 12. sales ──────────────────────────────────────────────────────────────
    log('Migrando: sales');
    {
      const { rows } = await src.query(
        `SELECT
           id, code, warehouse_id, customer_id,
           total_amount,
           taxable_base,
           igv_amount AS igv,
           payment_method,
           COALESCE(status, 'COMPLETED') AS status,
           document_type, serie, correlativo,
           full_invoice_number, sunat_status,
           xml_path, cdr_path, notes,
           deleter_user_id AS deleted_by_id,
           is_deleted,
           creator_user_id,
           creation_time
         FROM sales ORDER BY id`,
      );
      for (const r of rows) {
        const newId         = toUUID(NS.SALE, r.id);
        idMap.sales.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        const creatorUUID   = mapId(idMap.users, r.creator_user_id);
        if (!warehouseUUID || !creatorUUID) {
          warn(`sale ${r.id}: FK faltante, omitido`);
          continue;
        }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO sales (
             id, code, warehouse_id, customer_id,
             total_amount, taxable_base, igv,
             payment_method, status,
             document_type, serie, correlativo,
             full_invoice_number, sunat_status,
             xml_path, cdr_path, notes,
             deleted_by_id, is_deleted,
             created_by_id, creation_time
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            r.code ?? null,
            warehouseUUID,
            mapId(idMap.customers, r.customer_id),
            r.total_amount,
            r.taxable_base ?? null,
            r.igv ?? null,
            r.payment_method,
            r.status,
            normalizeDocumentType(r.document_type),   // TICKET_INTERNO → TICKET
            r.serie ?? null,
            r.correlativo ?? null,
            r.full_invoice_number ?? null,
            r.sunat_status ?? null,
            r.xml_path ?? null,
            r.cdr_path ?? null,
            r.notes ?? null,
            mapId(idMap.users, r.deleted_by_id),
            isDeleted,
            creatorUUID,
            r.creation_time,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 12b. sale_details ──────────────────────────────────────────────────────
    log('Migrando: sale_details');
    {
      const { rows } = await src.query(
        `SELECT
           id, sale_id, product_id, size_id, color_id,
           product_name_snapshot,
           COALESCE(size_name_snapshot, '') AS size_snapshot,
           color_name_snapshot AS color_snapshot,
           quantity, unit_price, subtotal
         FROM sale_details ORDER BY id`,
      );
      for (const r of rows) {
        const newId           = toUUID(NS.SALE_DETAIL, r.id);
        const saleUUID        = mapId(idMap.sales, r.sale_id);
        const productSizeUUID =
          productSizeByProductAndSize.get(`${r.product_id}:${r.size_id}`) ?? null;
        if (!saleUUID || !productSizeUUID) continue;
        await dst.query(
          `INSERT INTO sale_details (
             id, sale_id, product_size_id, color_id,
             product_name_snapshot, size_snapshot, color_snapshot,
             quantity, unit_price, subtotal
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            saleUUID,
            productSizeUUID,
            mapId(idMap.colors, r.color_id),
            r.product_name_snapshot ?? '',
            r.size_snapshot,
            r.color_snapshot ?? null,
            r.quantity,
            r.unit_price,
            r.subtotal,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 12c. sale_payments ─────────────────────────────────────────────────────
    log('Migrando: sale_payments');
    {
      const exists = await tableExists(src, 'sale_payments');
      if (exists) {
        const { rows } = await src.query(
          `SELECT id, sale_id, method, amount, reference FROM sale_payments ORDER BY id`,
        );
        for (const r of rows) {
          const newId    = toUUID(NS.SALE_PAYMENT, r.id);
          const saleUUID = mapId(idMap.sales, r.sale_id);
          if (!saleUUID) continue;
          await dst.query(
            `INSERT INTO sale_payments (id, sale_id, method, amount, reference)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [newId, saleUUID, r.method, r.amount, r.reference ?? null],
          );
        }
        console.log(`     → ${rows.length} registros`);
      } else {
        warn('Tabla sale_payments no encontrada en origen, omitida');
      }
    }

    // ── 13. cash_movements ─────────────────────────────────────────────────────
    log('Migrando: cash_movements');
    {
      const { rows } = await src.query(
        `SELECT
           id, warehouse_id, type, amount,
           COALESCE(category, expense_category, 'GENERAL') AS category,
           payment_method, description, date,
           COALESCE(accounting_month, TO_CHAR(date, 'YYYY-MM')) AS accounting_month,
           purchase_id,
           COALESCE(accumulated_balance_applied, false) AS accumulated_balance_applied,
           is_deleted,
           creator_user_id,
           creation_time
         FROM cash_movements ORDER BY id`,
      );
      for (const r of rows) {
        const newId         = toUUID(NS.CASH_MOVEMENT, r.id);
        idMap.cashMovements.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        const creatorUUID   = mapId(idMap.users, r.creator_user_id);
        if (!warehouseUUID || !creatorUUID) {
          warn(`cash_movement ${r.id}: FK faltante, omitido`);
          continue;
        }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO cash_movements (
             id, warehouse_id, type, amount, category,
             payment_method, description, date,
             accounting_month, purchase_id,
             accumulated_balance_applied, is_deleted,
             created_by_id, creation_time
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            warehouseUUID,
            r.type,
            r.amount,
            r.category,
            r.payment_method,
            r.description ?? null,
            r.date,
            r.accounting_month,
            mapId(idMap.purchases, r.purchase_id),
            r.accumulated_balance_applied,
            isDeleted,
            creatorUUID,
            r.creation_time,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 14. teams ──────────────────────────────────────────────────────────────
    log('Migrando: teams');
    {
      const { rows } = await src.query(
        `SELECT id, dni, name, surname, salary, warehouse_id, user_id, is_deleted
         FROM teams ORDER BY id`,
      );
      for (const r of rows) {
        const newId         = toUUID(NS.TEAM, r.id);
        idMap.teams.set(String(r.id), newId);
        const warehouseUUID = mapId(idMap.warehouses, r.warehouse_id);
        if (!warehouseUUID) { warn(`team ${r.id}: warehouse sin mapeo, omitido`); continue; }
        const { isDeleted } = laravelAudit(r);
        await dst.query(
          `INSERT INTO teams (id, dni, name, surname, salary, warehouse_id, user_id, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            r.dni,
            r.name,
            r.surname,
            r.salary,
            warehouseUUID,
            mapId(idMap.users, r.user_id),
            isDeleted,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 15. attendances ────────────────────────────────────────────────────────
    log('Migrando: attendances');
    {
      const { rows } = await src.query(
        `SELECT
           id, team_id, date, status,
           check_in_time AS check_in,
           check_out_time AS check_out,
           COALESCE(delay_minutes, 0) AS delay_minutes,
           notes
         FROM attendances ORDER BY id`,
      );
      for (const r of rows) {
        const newId    = toUUID(NS.ATTENDANCE, r.id);
        const teamUUID = mapId(idMap.teams, r.team_id);
        if (!teamUUID) continue;
        await dst.query(
          `INSERT INTO attendances (id, team_id, date, status, check_in, check_out, delay_minutes, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (team_id, date) DO NOTHING`,
          [
            newId,
            teamUUID,
            r.date,
            r.status,
            combineDateAndTime(r.date, r.check_in),
            combineDateAndTime(r.date, r.check_out),
            r.delay_minutes,
            r.notes ?? null,
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── 16. team_payments ────────────────────────────────────────────────────
    log('Migrando: team_payments');
    {
      const { rows } = await src.query(
        `SELECT
           id, team_id, type, amount, date,
           payroll_period, accounting_month, payment_method, cash_movement_id,
           is_deleted
         FROM team_payments
         ORDER BY id`,
      );
      for (const r of rows) {
        if (r.is_deleted) continue;
        const newId = toUUID(NS.TEAM_PAYMENT, r.id);
        const teamUUID = mapId(idMap.teams, r.team_id);
        if (!teamUUID) {
          warn(`team_payment ${r.id}: team sin mapeo, omitido`);
          continue;
        }
        await dst.query(
          `INSERT INTO team_payments (
             id, team_id, type, amount, date,
             payroll_period, accounting_month, payment_method, cash_movement_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            newId,
            teamUUID,
            r.type,
            r.amount,
            r.date,
            r.payroll_period ?? null,
            r.accounting_month ?? null,
            r.payment_method ?? 'CASH',
            mapId(idMap.cashMovements, r.cash_movement_id),
          ],
        );
      }
      console.log(`     → ${rows.length} registros`);
    }

    // ── Restaurar FK triggers y confirmar transacción ──────────────────────────
    await dst.query('SET session_replication_role = DEFAULT');
    await dst.query('COMMIT');

    console.log('\n========================================================');
    console.log('  ✅  Migración completada con éxito.');
    console.log('========================================================\n');

  } catch (err: unknown) {
    console.error('\n❌  Error durante la migración, haciendo ROLLBACK...');
    if (err instanceof Error) {
      console.error('Causa:', err.message);
    }
    try {
      await dst.query('SET session_replication_role = DEFAULT');
      await dst.query('ROLLBACK');
    } catch { /* ignorar errores de rollback */ }
    throw err;
  } finally {
    await src.end().catch(() => undefined);
    await dst.end().catch(() => undefined);
  }
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

migrate().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error('\nDetalle:', err.message);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
