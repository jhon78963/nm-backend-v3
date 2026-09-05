// =============================================================================
// seed-document-series.ts — Crea series BOLETA/FACTURA por almacén si faltan.
// Idempotente: no modifica series ya existentes.
// =============================================================================

import { Client } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.migration' });

const NS_DOCUMENT_SERIES = 'a0000019-0000-5000-8000-000000000000';

const DEFAULT_SERIES = [
  { documentType: 'BOLETA', serie: 'B001' },
  { documentType: 'FACTURA', serie: 'F001' },
] as const;

const dstConfig = {
  host: process.env.DST_DB_HOST ?? process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.DST_DB_PORT ?? process.env.POSTGRES_PORT ?? 5432),
  database: process.env.DST_DB_NAME ?? process.env.POSTGRES_DB ?? 'nm_services',
  user: process.env.DST_DB_USER ?? process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.DST_DB_PASSWORD ?? process.env.POSTGRES_PASSWORD ?? 'postgres',
};

function toSeriesId(warehouseId: string, documentType: string, serie: string): string {
  return uuidv5(`${warehouseId}:${documentType}:${serie}`, NS_DOCUMENT_SERIES);
}

async function resolveNextNumber(
  client: Client,
  warehouseId: string,
  documentType: string,
  serie: string,
): Promise<number> {
  const { rows } = await client.query<{ next_number: number | null }>(
    `SELECT COALESCE(MAX(correlativo), 0) + 1 AS next_number
     FROM sales
     WHERE warehouse_id = $1
       AND document_type = $2
       AND serie = $3
       AND correlativo IS NOT NULL`,
    [warehouseId, documentType, serie],
  );

  const nextNumber = rows[0]?.next_number;
  return typeof nextNumber === 'number' && nextNumber > 0 ? nextNumber : 1;
}

async function seedDocumentSeries(): Promise<void> {
  const client = new Client(dstConfig);
  await client.connect();

  try {
    const { rows: warehouses } = await client.query<{ id: string; name: string }>(
      `SELECT id, name
       FROM warehouses
       WHERE is_deleted = false
       ORDER BY name`,
    );

    let created = 0;

    for (const warehouse of warehouses) {
      for (const series of DEFAULT_SERIES) {
        const { rows: existing } = await client.query<{ id: string }>(
          `SELECT id
           FROM document_series
           WHERE warehouse_id = $1
             AND document_type = $2
           LIMIT 1`,
          [warehouse.id, series.documentType],
        );

        if (existing.length > 0) {
          continue;
        }

        const currentNumber = await resolveNextNumber(
          client,
          warehouse.id,
          series.documentType,
          series.serie,
        );

        await client.query(
          `INSERT INTO document_series (id, warehouse_id, document_type, serie, current_number)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (warehouse_id, document_type, serie) DO NOTHING`,
          [
            toSeriesId(warehouse.id, series.documentType, series.serie),
            warehouse.id,
            series.documentType,
            series.serie,
            currentNumber,
          ],
        );

        created += 1;
        console.log(
          `  + ${warehouse.name}: ${series.documentType} ${series.serie} (siguiente ${currentNumber})`,
        );
      }
    }

    console.log(`Series documentales OK (${created} creadas).`);
  } finally {
    await client.end();
  }
}

seedDocumentSeries().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
