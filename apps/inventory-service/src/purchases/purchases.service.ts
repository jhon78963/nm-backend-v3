import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { InventoryBalanceService } from '../inventory/inventory-balance.service';
import {
  RegisterBulkPurchaseDto,
  PurchaseLineDto,
} from './dto/register-bulk-purchase.dto';

/**
 * PurchasesService — Equivale a la combinación de:
 *   PurchaseBulkService + PurchaseLineMutationService + PurchaseCancellationService
 *
 * INVARIANTE CRÍTICA (copiada de Laravel):
 * Registrar una compra SIEMPRE ajusta el inventario en la misma transacción.
 * Cancelar una compra SIEMPRE revierte los movements del ledger.
 * Nunca se modifica stock "suelto" fuera de esta clase.
 */
@Injectable()
export class PurchasesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly balance: InventoryBalanceService,
  ) {}

  // ── Registro masivo de compra ──────────────────────────────────────────────

  async registerBulk(dto: RegisterBulkPurchaseDto, createdById: string) {
    return this.db.$transaction(async (tx) => {
      // 1. Calcular totales
      const totalAmount = dto.lines.reduce(
        (sum, l) => sum + l.purchasePrice * l.quantity,
        0,
      );

      // 2. Crear cabecera de compra
      const purchase = await tx.purchase.create({
        data: {
          warehouseId: dto.warehouseId,
          vendorId: dto.vendorId,
          supplierName: dto.supplierName,
          currency: dto.currency ?? 'PEN',
          exchangeRate: dto.exchangeRate,
          totalAmount,
          status: 'ACTIVE',
          notes: dto.notes,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
          createdById,
        },
      });

      // 3. Crear líneas y ajustar ledger de inventario
      for (const lineDto of dto.lines) {
        const productSize = await this.resolveProductSize(tx, lineDto);

        const line = await tx.purchaseLine.create({
          data: {
            purchaseId: purchase.id,
            productId: lineDto.productId,
            sizeId: lineDto.sizeId,
            productSizeId: productSize.id,
            purchasePrice: lineDto.purchasePrice,
            salePrice: lineDto.salePrice,
            quantity: lineDto.quantity,
            hasColorBreakdown: (lineDto.colorDeltas?.length ?? 0) > 0,
          },
        });

        if (lineDto.colorDeltas?.length) {
          // Ingreso con desglose por color
          this.validateColorDeltasTotal(lineDto);

          for (const delta of lineDto.colorDeltas) {
            await tx.purchaseLineColorDelta.create({
              data: { purchaseLineId: line.id, colorId: delta.colorId, quantity: delta.quantity },
            });

            await tx.inventoryBalance.upsert({
              where: {
                warehouseId_productSizeId_colorId: {
                  warehouseId: dto.warehouseId,
                  productSizeId: productSize.id,
                  colorId: delta.colorId,
                },
              },
              create: {
                warehouseId: dto.warehouseId,
                productSizeId: productSize.id,
                colorId: delta.colorId,
                quantity: delta.quantity,
              },
              update: { quantity: { increment: delta.quantity } },
            });
          }
        } else {
          // Sin desglose: stock genérico (colorId = null o color "sin color")
          const noColorId = await this.getNoColorId(tx);
          await tx.inventoryBalance.upsert({
            where: {
              warehouseId_productSizeId_colorId: {
                warehouseId: dto.warehouseId,
                productSizeId: productSize.id,
                colorId: noColorId,
              },
            },
            create: {
              warehouseId: dto.warehouseId,
              productSizeId: productSize.id,
              colorId: noColorId,
              quantity: lineDto.quantity,
            },
            update: { quantity: { increment: lineDto.quantity } },
          });
        }

        // Registrar el movimiento de inventario (ledger)
        await tx.inventoryMovement.create({
          data: {
            warehouseId: dto.warehouseId,
            productSizeId: productSize.id,
            colorId: lineDto.colorDeltas?.[0]?.colorId ?? (await this.getNoColorId(tx)),
            direction: 'IN',
            quantity: lineDto.quantity,
            movementType: 'PURCHASE',
            referenceId: purchase.id,
            referenceType: 'Purchase',
            occurredAt: new Date(),
            createdById,
          },
        });
      }

      return tx.purchase.findFirst({
        where: { id: purchase.id },
        include: { lines: { include: { colorDeltas: true } } },
      });
    });
  }

  // ── Cancelar compra ────────────────────────────────────────────────────────

  async cancel(purchaseId: string, reason: string, cancelledById: string) {
    const purchase = await this.db.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
      include: { lines: { include: { colorDeltas: true } } },
    });

    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    if (purchase.status === 'CANCELLED') {
      throw new BadRequestException('La compra ya fue cancelada.');
    }

    return this.db.$transaction(async (tx) => {
      // Revertir stock: crear movements de salida por cada línea
      for (const line of purchase.lines) {
        if (line.hasColorBreakdown) {
          for (const delta of line.colorDeltas) {
            await tx.inventoryBalance.update({
              where: {
                warehouseId_productSizeId_colorId: {
                  warehouseId: purchase.warehouseId,
                  productSizeId: line.productSizeId,
                  colorId: delta.colorId,
                },
              },
              data: { quantity: { decrement: delta.quantity } },
            });
          }
        }

        await tx.inventoryMovement.create({
          data: {
            warehouseId: purchase.warehouseId,
            productSizeId: line.productSizeId,
            colorId: line.colorDeltas[0]?.colorId ?? (await this.getNoColorId(tx)),
            direction: 'OUT',
            quantity: line.quantity,
            movementType: 'PURCHASE_CANCELLED',
            referenceId: purchaseId,
            referenceType: 'Purchase',
            occurredAt: new Date(),
            createdById: cancelledById,
          },
        });
      }

      return tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason,
          cancelledById,
          cancelledAt: new Date(),
        },
      });
    });
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  async findAll(warehouseId: string, page = 1, perPage = 20) {
    const [data, total] = await this.db.$transaction([
      this.db.purchase.findMany({
        where: { warehouseId, isDeleted: false },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { purchaseDate: 'desc' },
        include: {
          vendor: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.db.purchase.count({ where: { warehouseId, isDeleted: false } }),
    ]);
    return { data, meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) } };
  }

  async findById(id: string) {
    const purchase = await this.db.purchase.findFirst({
      where: { id, isDeleted: false },
      include: {
        vendor: { select: { id: true, name: true } },
        lines: {
          include: {
            productSize: {
              include: {
                product: { select: { id: true, name: true } },
                size: { select: { id: true, description: true } },
              },
            },
            colorDeltas: { include: { color: true } },
          },
        },
      },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    return purchase;
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resolveProductSize(tx: any, line: PurchaseLineDto) {
    if (line.productSizeId) {
      return tx.productSize.findFirst({ where: { id: line.productSizeId } });
    }
    const ps = await tx.productSize.findFirst({
      where: { productId: line.productId, sizeId: line.sizeId, isDeleted: false },
    });
    if (!ps) {
      throw new BadRequestException(
        `No se encontró la talla para el producto ${line.productId}.`,
      );
    }
    return ps;
  }

  private validateColorDeltasTotal(line: PurchaseLineDto) {
    if (!line.colorDeltas?.length) return;
    const total = line.colorDeltas.reduce((s, d) => s + d.quantity, 0);
    if (total !== line.quantity) {
      throw new BadRequestException(
        `El total de colorDeltas (${total}) no coincide con la cantidad de la línea (${line.quantity}).`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getNoColorId(tx: any): Promise<string> {
    const noColor = await tx.color.findFirst({
      where: { description: 'Sin color' },
    });
    if (!noColor) throw new BadRequestException('Color "Sin color" no configurado en la base de datos.');
    return noColor.id;
  }
}
