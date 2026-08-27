// =============================================================================
// ETL: permissions + role_permissions (Laravel nm_db) → nm_services
// Ejecutar: npm run db:migrate:permissions
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
  ROLE: 'a0000008-0000-5000-8000-000000000000',
  PERMISSION: 'a0000019-0000-5000-8000-000000000000',
} as const;

function toUUID(namespace: string, legacyId: string | number): string {
  return uuidv5(String(legacyId), namespace);
}

async function migratePermissions(): Promise<void> {
  const src = new Client(srcConfig);
  const dst = new Client(dstConfig);

  console.log('Migrando permissions y role_permissions...');

  await src.connect();
  await dst.connect();

  try {
    const permMap = new Map<string, string>();

    const { rows: permissions } = await src.query(
      `SELECT id, name, guard_name FROM permissions ORDER BY id`,
    );

    await dst.query('BEGIN');

    for (const p of permissions) {
      const newId = toUUID(NS.PERMISSION, p.id);
      await dst.query(
        `INSERT INTO permissions (id, name, guard_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET guard_name = EXCLUDED.guard_name`,
        [newId, p.name, p.guard_name ?? 'api'],
      );

      const resolved = await dst.query<{ id: string }>(
        'SELECT id FROM permissions WHERE name = $1',
        [p.name],
      );
      permMap.set(String(p.id), resolved.rows[0].id);
    }

    const { rows: rolePerms } = await src.query(
      `SELECT role_id, permission_id FROM role_has_permissions ORDER BY role_id, permission_id`,
    );

    let linked = 0;
    for (const rp of rolePerms) {
      const roleId = toUUID(NS.ROLE, rp.role_id);
      const permissionId = permMap.get(String(rp.permission_id));
      if (!permissionId) continue;

      await dst.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleId, permissionId],
      );
      linked++;
    }

    await dst.query('COMMIT');

    const counts = await dst.query<{
      permissions: number;
      role_permissions: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM permissions) AS permissions,
         (SELECT COUNT(*)::int FROM role_permissions) AS role_permissions`,
    );

    console.log('\n✅ Migración completada.');
    console.log(`   Permisos en origen: ${permissions.length}`);
    console.log(`   Vínculos role↔permiso insertados: ${linked}`);
    console.log(`   Total permisos destino: ${counts.rows[0].permissions}`);
    console.log(`   Total role_permissions destino: ${counts.rows[0].role_permissions}`);
  } catch (err) {
    await dst.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await src.end().catch(() => undefined);
    await dst.end().catch(() => undefined);
  }
}

migratePermissions().catch((err: unknown) => {
  console.error('❌ Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
