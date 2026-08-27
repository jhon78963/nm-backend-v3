/**
 * Importa team_payments desde nm_db → nm_services.
 * Ejecutar: npx ts-node --project tsconfig.migration.json scripts/migrate-team-payments.ts
 */
import { Client } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const NS = {
  TEAM: 'a0000016-0000-5000-8000-000000000000',
  CASH_MOVEMENT: 'a0000015-0000-5000-8000-000000000000',
  TEAM_PAYMENT: 'a0000018-0000-5000-8000-000000000000',
} as const;

function toUUID(namespace: string, legacyId: string | number): string {
  return uuidv5(String(legacyId), namespace);
}

async function main() {
  const src = new Client({
    host: process.env.SRC_DB_HOST ?? 'localhost',
    port: Number(process.env.SRC_DB_PORT ?? 5432),
    database: process.env.SRC_DB_NAME ?? 'nm_db',
    user: process.env.SRC_DB_USER ?? 'postgres',
    password: process.env.SRC_DB_PASSWORD ?? 'postgres',
  });
  const dst = new Client({
    host: process.env.DST_DB_HOST ?? 'localhost',
    port: Number(process.env.DST_DB_PORT ?? 5433),
    database: process.env.DST_DB_NAME ?? 'nm_services',
    user: process.env.DST_DB_USER ?? 'postgres',
    password: process.env.DST_DB_PASSWORD ?? 'password',
  });

  await src.connect();
  await dst.connect();

  const { rows } = await src.query(
    `SELECT
       id, team_id, type, amount, date,
       payroll_period, accounting_month, payment_method, cash_movement_id,
       is_deleted
     FROM team_payments
     ORDER BY id`,
  );

  let inserted = 0;
  for (const r of rows) {
    if (r.is_deleted) continue;

    const teamCheck = await dst.query('SELECT id FROM teams WHERE id = $1', [
      toUUID(NS.TEAM, r.team_id),
    ]);
    if (teamCheck.rowCount === 0) {
      console.warn(`Omitido payment ${r.id}: team ${r.team_id} no existe en destino`);
      continue;
    }

    const cashMovementId = r.cash_movement_id
      ? toUUID(NS.CASH_MOVEMENT, r.cash_movement_id)
      : null;
    let linkedCashMovementId: string | null = null;
    if (cashMovementId) {
      const cmCheck = await dst.query('SELECT id FROM cash_movements WHERE id = $1', [
        cashMovementId,
      ]);
      if ((cmCheck.rowCount ?? 0) > 0) {
        linkedCashMovementId = cashMovementId;
      } else {
        console.warn(`Payment ${r.id}: cash_movement ${r.cash_movement_id} no existe, se importa sin vínculo`);
      }
    }

    try {
      const result = await dst.query(
        `INSERT INTO team_payments (
           id, team_id, type, amount, date,
           payroll_period, accounting_month, payment_method, cash_movement_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          toUUID(NS.TEAM_PAYMENT, r.id),
          toUUID(NS.TEAM, r.team_id),
          r.type,
          r.amount,
          r.date,
          r.payroll_period ?? null,
          r.accounting_month ?? null,
          r.payment_method ?? 'CASH',
          linkedCashMovementId,
        ],
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error importando team_payment ${r.id}: ${message}`);
    }
  }

  console.log(`team_payments importados: ${inserted} de ${rows.length}`);
  await src.end();
  await dst.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
