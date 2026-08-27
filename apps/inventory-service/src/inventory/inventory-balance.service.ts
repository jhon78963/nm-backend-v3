import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';

export interface StockAdjustment {
  warehouseId: string;
  productSizeId: string;
  colorId: string;
  delta: number;                      // positivo = ingreso, negativo = salida
  movementType: string;               // 'PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN'
  referenceId?: string;               // UUID de la venta/compra que originó el movimiento
  referenceType?: string;             // 'Sale' | 'Purchase'
  occurredAt?: Date;
  createdById: string;
}

/**
 * InventoryBalanceService — Equivale a la lógica del ledger en Laravel:
 *   InventoryMovementService (crea movements) +
 *   lógica de actualización de InventoryBalance.
 *
 * PATRÓN DE LEDGER:
 *   Nunca se modifica stock directamente. Cada cambio de stock:
 *   1. Crea un InventoryMovement (dirección, cantidad, tipo, referencia)
 *   2. Actualiza el InventoryBalance (upsert atómico en la misma transacción)
 *   Equivale al comportamiento de InventoryMovementService@record() de Laravel.
 */
@Injectable()
export class InventoryBalanceService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * getBalance — Equivale a InventoryBalance::where(filters)->first()
   * Retorna el stock actual para un combo warehouse+productSize+color.
   */
  async getBalance(
    warehouseId: string,
    productSizeId: string,
    colorId: string,
  ): Promise<number> {
    const balance = await this.db.inventoryBalance.findFirst({
      where: { warehouseId, productSizeId, colorId },
      select: { quantity: true },
    });
    return balance?.quantity ?? 0;
  }

  /**
   * adjust — Operación central del ledger. Atómica: crea el movement
   * y actualiza el balance en la misma transacción Prisma.
   */
  async adjust(adj: StockAdjustment) {
    return this.db.$transaction(async (tx: any) => {
      const direction = adj.delta >= 0 ? 'IN' : 'OUT';
      const absQuantity = Math.abs(adj.delta);

      // 1. Upsert del balance (equivale al updateOrCreate de Laravel)
      const balance = await tx.inventoryBalance.upsert({
        where: {
          warehouseId_productSizeId_colorId: {
            warehouseId: adj.warehouseId,
            productSizeId: adj.productSizeId,
            colorId: adj.colorId,
          },
        },
        create: {
          warehouseId: adj.warehouseId,
          productSizeId: adj.productSizeId,
          colorId: adj.colorId,
          quantity: Math.max(0, adj.delta),
        },
        update: {
          quantity: { increment: adj.delta },
        },
      });

      // 2. Registrar el movimiento (ledger inmutable)
      await tx.inventoryMovement.create({
        data: {
          warehouseId: adj.warehouseId,
          productSizeId: adj.productSizeId,
          colorId: adj.colorId,
          direction,
          quantity: absQuantity,
          movementType: adj.movementType,
          referenceId: adj.referenceId,
          referenceType: adj.referenceType,
          balanceAfter: balance.quantity,
          occurredAt: adj.occurredAt ?? new Date(),
          createdById: adj.createdById,
        },
      });

      return balance;
    });
  }

  /**
   * getStockSummary — Resumen de stock por producto para un warehouse.
   * Equivale a la consulta agrupada de InventoryBalance de Laravel.
   */
  async getStockSummary(warehouseId: string, productId?: string) {
    return this.db.inventoryBalance.findMany({
      where: {
        warehouseId,
        ...(productId && {
          productSize: { productId },
        }),
      },
      include: {
        productSize: {
          include: {
            product: { select: { id: true, name: true } },
            size: { select: { id: true, description: true } },
          },
        },
        color: { select: { id: true, description: true, hash: true } },
      },
    });
  }

  /**
   * bulkAdjust — Ajuste masivo (usado en PurchaseBulkService).
   * Equivale a PurchaseBulk registrando múltiples movements en una TX.
   */
  async bulkAdjust(adjustments: StockAdjustment[]) {
    return this.db.$transaction(
      adjustments.map((adj) => {
        const direction = adj.delta >= 0 ? 'IN' : 'OUT';
        return this.db.inventoryBalance.upsert({
          where: {
            warehouseId_productSizeId_colorId: {
              warehouseId: adj.warehouseId,
              productSizeId: adj.productSizeId,
              colorId: adj.colorId,
            },
          },
          create: {
            warehouseId: adj.warehouseId,
            productSizeId: adj.productSizeId,
            colorId: adj.colorId,
            quantity: Math.max(0, adj.delta),
          },
          update: { quantity: { increment: adj.delta } },
        });
      }),
    );
  }
}
