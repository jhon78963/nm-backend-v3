// =============================================================================
// ETL: user_action_logs (Laravel nm_db) → nm_services
// Ejecutar: npx ts-node --project tsconfig.migration.json scripts/migrate-action-logs.ts
// =============================================================================

import { Client } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const srcConfig = {
  host: process.env.SRC_DB_HOST ?? 'localhost',
  port: Number(process.env.SRC_DB_PORT ?? 5432),
  database: process.env.SRC_DB_NAME ?? 'nm_db',
  user: process.env.SRC_DB_USER ?? 'postgres',
  password: process.env.SRC_DB_PASSWORD ?? 'postgres',
};

const dstConfig = {
  host: process.env.DST_DB_HOST ?? 'localhost',
  port: Number(process.env.DST_DB_PORT ?? 5433),
  database: process.env.DST_DB_NAME ?? 'nm_services',
  user: process.env.DST_DB_USER ?? 'postgres',
  password: process.env.DST_DB_PASSWORD ?? 'password',
};

const NS = {
  USER: 'a0000007-0000-5000-8000-000000000000',
  WAREHOUSE: 'a0000002-0000-5000-8000-000000000000',
  ACTION_LOG: 'a0000018-0000-5000-8000-000000000000',
  TENANT: 'a0000001-0000-5000-8000-000000000000',
} as const;

function toUUID(namespace: string, legacyId: string | number): string {
  return uuidv5(String(legacyId), namespace);
}

async function migrateActionLogs(): Promise<void> {
  const src = new Client(srcConfig);
  const dst = new Client(dstConfig);

  console.log('Migrando user_action_logs...');
  console.log(`  Origen:  ${srcConfig.database}@${srcConfig.host}:${srcConfig.port}`);
  console.log(`  Destino: ${dstConfig.database}@${dstConfig.host}:${dstConfig.port}`);

  await src.connect();
  await dst.connect();

  try {
    const warehouseTenant = new Map<string, string>();
    const { rows: warehouses } = await src.query(
      'SELECT id, tenant_id FROM warehouses ORDER BY id',
    );
    for (const w of warehouses) {
      warehouseTenant.set(
        String(w.id),
        toUUID(NS.TENANT, w.tenant_id),
      );
    }

    const { rows: users } = await src.query(
      'SELECT id, tenant_id FROM users ORDER BY id',
    );
    const userTenant = new Map<string, string>();
    for (const u of users) {
      if (u.tenant_id != null) {
        userTenant.set(String(u.id), toUUID(NS.TENANT, u.tenant_id));
      }
    }

    const { rows: logs } = await src.query(
      `SELECT id, creation_time, user_id, warehouse_id, action, description, metadata, ip_address
       FROM user_action_logs
       ORDER BY id`,
    );

    await dst.query('BEGIN');

    let inserted = 0;
    let skipped = 0;

    for (const row of logs) {
      if (row.user_id == null) {
        skipped++;
        continue;
      }

      const userUUID = toUUID(NS.USER, row.user_id);
      const warehouseUUID =
        row.warehouse_id != null
          ? toUUID(NS.WAREHOUSE, row.warehouse_id)
          : null;

      const tenantId =
        (row.warehouse_id != null
          ? warehouseTenant.get(String(row.warehouse_id))
          : undefined) ??
        userTenant.get(String(row.user_id)) ??
        null;

      const newId = toUUID(NS.ACTION_LOG, row.id);

      await dst.query(
        `INSERT INTO user_action_logs (
           id, action, description, metadata, ip_address,
           user_id, tenant_id, warehouse_id, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          newId,
          String(row.action).slice(0, 100),
          row.description ?? null,
          row.metadata ?? null,
          row.ip_address ?? null,
          userUUID,
          tenantId,
          warehouseUUID,
          row.creation_time ?? new Date(),
        ],
      );
      inserted++;
    }

    await dst.query('COMMIT');

    const { rows: countRows } = await dst.query(
      'SELECT COUNT(*)::int AS total FROM user_action_logs',
    );

    console.log(`\n✅ Migración completada.`);
    console.log(`   Procesados: ${logs.length}`);
    console.log(`   Insertados: ${inserted}`);
    console.log(`   Omitidos (sin user_id): ${skipped}`);
    console.log(`   Total en destino: ${countRows[0].total}`);
  } catch (err) {
    await dst.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await src.end().catch(() => undefined);
    await dst.end().catch(() => undefined);
  }
}

migrateActionLogs().catch((err: unknown) => {
  console.error('❌ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
