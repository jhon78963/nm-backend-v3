import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';

/**
 * DocumentSeriesService — Equivale a DocumentSeriesService de Laravel.
 * Gestiona las series documentales (B001, F001, etc.) y el correlativo
 * de cada tipo de comprobante por almacén.
 *
 * CONCURRENCIA: el incremento del correlativo se hace con una operación
 * atómica `update { currentNumber: { increment: 1 } }` dentro de la misma
 * TX del checkout para garantizar unicidad (equivale al LOCK del Laravel original).
 */
@Injectable()
export class DocumentSeriesService {
  constructor(private readonly db: DatabaseService) {}

  async getNextNumber(
    warehouseId: string,
    documentType: string,
  ): Promise<{ serie: string; nextNumber: number }> {
    const series = await this.db.documentSeries.findFirst({
      where: { warehouseId, documentType },
    });

    if (!series) {
      throw new NotFoundException(
        `No hay serie configurada para ${documentType} en el almacén ${warehouseId}. ` +
        `Configura una serie en Configuración → Series documentales.`,
      );
    }

    return { serie: series.serie, nextNumber: series.currentNumber };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async incrementNumber(tx: any, warehouseId: string, documentType: string, serie: string) {
    await tx.documentSeries.update({
      where: {
        warehouseId_documentType_serie: { warehouseId, documentType, serie },
      },
      data: { currentNumber: { increment: 1 } },
    });
  }

  async getSeries(warehouseId: string) {
    return this.db.documentSeries.findMany({ where: { warehouseId } });
  }

  async createSeries(warehouseId: string, documentType: string, serie: string) {
    return this.db.documentSeries.create({
      data: { warehouseId, documentType, serie, currentNumber: 1 },
    });
  }
}
