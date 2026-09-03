import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { formatProductHistoryLog } from './product-history.formatter';

interface RecordHistoryOptions {
  productId: string;
  eventType: string;
  reason?: string;
  oldValues?: unknown;
  newValues?: unknown;
  createdById: string;
}

/**
 * ProductHistoryService — Equivale a ProductHistoryService de Laravel.
 * Registra todos los cambios sobre un producto (precios, tallas, colores)
 * en la tabla product_histories para auditoría y trazabilidad.
 *
 * Acepta un `tx` (cliente Prisma de una transacción activa) o el cliente
 * global (`this.db`) para usarse dentro o fuera de transacciones.
 */
@Injectable()
export class ProductHistoryService {
  constructor(private readonly db: DatabaseService) {}

  async record(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    opts: RecordHistoryOptions,
  ) {
    return tx.productHistory.create({
      data: {
        productId: opts.productId,
        eventType: opts.eventType,
        reason: opts.reason,
        oldValues: opts.oldValues ? JSON.parse(JSON.stringify(opts.oldValues)) : undefined,
        newValues: opts.newValues ? JSON.parse(JSON.stringify(opts.newValues)) : undefined,
        createdById: opts.createdById,
      },
    });
  }

  async findByProduct(productId: string) {
    return this.db.productHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, username: true, name: true, surname: true } },
      },
    });
  }

  async getFormattedHistory(productId: string, _warehouseId?: string) {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        isDeleted: false,
      },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const logs = await this.findByProduct(productId);

    return {
      success: true,
      data: logs.map((log) =>
        formatProductHistoryLog({
          id: log.id,
          eventType: log.eventType,
          oldValues: log.oldValues,
          newValues: log.newValues,
          createdAt: log.createdAt,
          createdBy: log.createdBy,
        }),
      ),
    };
  }
}
