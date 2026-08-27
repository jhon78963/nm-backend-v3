import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

export interface KardexFilters {
  warehouseId: string;
  productId?: string;
  productSizeId?: string;
  colorId?: string;
  dateFrom?: string;
  dateTo?: string;
  movementType?: string;
  page?: number;
  perPage?: number;
}

/**
 * KardexService — Equivale a InventoryKardexReportService de Laravel.
 * Genera el reporte Kardex: historial de movimientos de inventario
 * con balance acumulado después de cada transacción.
 *
 * El Kardex es de solo lectura (los movements son inmutables una vez creados).
 */
@Injectable()
export class KardexService {
  constructor(private readonly db: DatabaseService) {}

  async getKardex(filters: KardexFilters) {
    const {
      warehouseId,
      productId,
      productSizeId,
      colorId,
      dateFrom,
      dateTo,
      movementType,
      page = 1,
      perPage = 50,
    } = filters;

    const where = {
      warehouseId,
      ...(productSizeId && { productSizeId }),
      ...(colorId && { colorId }),
      ...(movementType && { movementType }),
      ...(productId && { productSize: { productId } }),
      ...(dateFrom || dateTo
        ? {
            occurredAt: {
              ...(dateFrom && { gte: dayjs(dateFrom).startOf('day').toDate() }),
              ...(dateTo && { lte: dayjs(dateTo).endOf('day').toDate() }),
            },
          }
        : {}),
    };

    const [movements, total] = await this.db.$transaction([
      this.db.inventoryMovement.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { occurredAt: 'asc' },
        include: {
          productSize: {
            include: {
              product: { select: { id: true, name: true, barcode: true } },
              size: { select: { id: true, description: true } },
            },
          },
          color: { select: { id: true, description: true, hash: true } },
          createdBy: { select: { id: true, username: true } },
        },
      }),
      this.db.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => ({
        id: m.id,
        date: m.occurredAt,
        product: m.productSize.product,
        size: m.productSize.size,
        color: m.color,
        direction: m.direction,
        quantity: m.direction === 'IN' ? m.quantity : -m.quantity,
        movementType: m.movementType,
        balanceAfter: m.balanceAfter,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        registeredBy: m.createdBy,
      })),
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    };
  }

  async getProductStockSnapshot(productId: string, warehouseId: string) {
    return this.db.inventoryBalance.findMany({
      where: { warehouseId, productSize: { productId } },
      include: {
        productSize: { include: { size: true } },
        color: true,
      },
    });
  }
}
