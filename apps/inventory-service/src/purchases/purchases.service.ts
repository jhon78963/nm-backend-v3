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
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { UpdatePurchaseLineDto } from './dto/update-purchase-line.dto';
import { AppendPurchaseLinesDto } from './dto/append-purchase-lines.dto';

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
        await this.addPurchaseLine(tx, purchase, lineDto, createdById);
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
                size: {
                  select: {
                    id: true,
                    description: true,
                    sizeTypeId: true,
                    sizeType: { select: { id: true, description: true } },
                  },
                },
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

  // ── Actualizar cabecera ───────────────────────────────────────────────────

  async updateHeader(id: string, dto: UpdatePurchaseDto) {
    const purchase = await this.db.purchase.findFirst({
      where: { id, isDeleted: false },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    this.assertPurchaseMutable(purchase.status);

    await this.db.purchase.update({
      where: { id },
      data: {
        ...(dto.documentNote !== undefined && { notes: dto.documentNote }),
        ...(dto.registeredAt !== undefined && {
          purchaseDate: dto.registeredAt ? new Date(dto.registeredAt) : purchase.purchaseDate,
        }),
        ...(dto.supplierName !== undefined && { supplierName: dto.supplierName.trim() }),
        ...(dto.vendorId !== undefined && { vendorId: dto.vendorId || null }),
      },
    });

    return { message: 'Compra actualizada.' };
  }

  // ── Mutaciones de líneas ──────────────────────────────────────────────────

  async updateLine(purchaseId: string, lineId: string, dto: UpdatePurchaseLineDto, userId: string) {
    const purchase = await this.getMutablePurchaseWithLine(purchaseId, lineId);
    const line = purchase.lines[0];

    return this.db.$transaction(async (tx) => {
      await this.revertPurchaseLineStock(tx, purchase, line);

      await tx.purchaseLineColorDelta.deleteMany({
        where: { purchaseLineId: line.id },
      });

      const hasColorBreakdown = line.hasColorBreakdown;
      const colorDeltas = hasColorBreakdown
        ? (dto.colorDeltas ?? []).map((delta) => ({
            colorId: delta.colorId,
            quantity: delta.quantity,
          }))
        : [];
      const quantity = hasColorBreakdown
        ? colorDeltas.reduce((sum, delta) => sum + delta.quantity, 0)
        : Math.max(1, dto.sizeOnlyQuantity ?? line.quantity);

      if (hasColorBreakdown && colorDeltas.length === 0) {
        throw new BadRequestException('Indica las variantes de color y sus cantidades.');
      }

      await tx.productSize.update({
        where: { id: line.productSizeId },
        data: {
          ...(dto.barcode !== undefined && { barcode: dto.barcode?.trim() || null }),
          purchasePrice: dto.purchasePrice,
          ...(dto.salePrice !== undefined && dto.salePrice !== null && { salePrice: dto.salePrice }),
          ...(dto.minSalePrice !== undefined &&
            dto.minSalePrice !== null && { minSalePrice: dto.minSalePrice }),
        },
      });

      await tx.purchaseLine.update({
        where: { id: line.id },
        data: {
          purchasePrice: dto.purchasePrice,
          salePrice: dto.salePrice ?? null,
          quantity,
        },
      });

      await this.applyPurchaseLineStock(
        tx,
        purchase,
        {
          productSizeId: line.productSizeId,
          quantity,
          colorDeltas: hasColorBreakdown ? colorDeltas : undefined,
        },
        userId,
      );

      if (hasColorBreakdown) {
        for (const delta of colorDeltas) {
          await tx.purchaseLineColorDelta.create({
            data: {
              purchaseLineId: line.id,
              colorId: delta.colorId,
              quantity: delta.quantity,
            },
          });
        }
      }

      await this.refreshPurchaseTotals(tx, purchaseId);
      return { message: 'Línea actualizada.' };
    });
  }

  async deleteLine(purchaseId: string, lineId: string, userId: string) {
    const purchase = await this.getMutablePurchaseWithLine(purchaseId, lineId);
    const line = purchase.lines[0];

    return this.db.$transaction(async (tx) => {
      await this.revertPurchaseLineStock(tx, purchase, line);

      await tx.purchaseLineColorDelta.deleteMany({
        where: { purchaseLineId: line.id },
      });
      await tx.purchaseLine.delete({ where: { id: line.id } });
      await this.refreshPurchaseTotals(tx, purchaseId);

      await tx.inventoryMovement.create({
        data: {
          warehouseId: purchase.warehouseId,
          productSizeId: line.productSizeId,
          colorId: line.colorDeltas[0]?.colorId ?? (await this.getNoColorId(tx)),
          direction: 'OUT',
          quantity: line.quantity,
          movementType: 'PURCHASE_LINE_REMOVED',
          referenceId: purchaseId,
          referenceType: 'Purchase',
          occurredAt: new Date(),
          createdById: userId,
        },
      });

      return { message: 'Línea eliminada y stock revertido.' };
    });
  }

  async appendLines(purchaseId: string, dto: AppendPurchaseLinesDto, userId: string) {
    const purchase = await this.db.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
      include: { lines: true },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada.');
    this.assertPurchaseMutable(purchase.status);

    return this.db.$transaction(async (tx) => {
      for (const lineDto of dto.lines) {
        await this.addPurchaseLine(tx, purchase, lineDto, userId);
      }
      await this.refreshPurchaseTotals(tx, purchaseId);
      return { message: 'Líneas agregadas.' };
    });
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private assertPurchaseMutable(status: string) {
    if (status === 'CANCELLED') {
      throw new BadRequestException('La compra está anulada.');
    }
  }

  private async getMutablePurchaseWithLine(purchaseId: string, lineId: string) {
    const purchase = await this.db.purchase.findFirst({
      where: { id: purchaseId, isDeleted: false },
      include: {
        lines: {
          where: { id: lineId },
          include: { colorDeltas: true },
        },
      },
    });

    if (!purchase || purchase.lines.length === 0) {
      throw new NotFoundException('Línea de compra no encontrada.');
    }

    this.assertPurchaseMutable(purchase.status);
    return purchase;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async refreshPurchaseTotals(tx: any, purchaseId: string) {
    const lines = await tx.purchaseLine.findMany({ where: { purchaseId } });
    const totalAmount = lines.reduce(
      (sum: number, line: { purchasePrice: unknown; quantity: number }) =>
        sum + Number(line.purchasePrice) * line.quantity,
      0,
    );

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { totalAmount },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async addPurchaseLine(
    tx: any,
    purchase: { id: string; warehouseId: string },
    lineDto: PurchaseLineDto,
    createdById: string,
  ) {
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
      this.validateColorDeltasTotal(lineDto);

      for (const delta of lineDto.colorDeltas) {
        await tx.purchaseLineColorDelta.create({
          data: { purchaseLineId: line.id, colorId: delta.colorId, quantity: delta.quantity },
        });
      }
    }

    await this.applyPurchaseLineStock(
      tx,
      purchase,
      {
        productSizeId: productSize.id,
        quantity: lineDto.quantity,
        colorDeltas: lineDto.colorDeltas,
      },
      createdById,
    );

    return line;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async applyPurchaseLineStock(
    tx: any,
    purchase: { id: string; warehouseId: string },
    input: {
      productSizeId: string;
      quantity: number;
      colorDeltas?: Array<{ colorId: string; quantity: number }>;
    },
    createdById: string,
  ) {
    if (input.colorDeltas?.length) {
      for (const delta of input.colorDeltas) {
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_productSizeId_colorId: {
              warehouseId: purchase.warehouseId,
              productSizeId: input.productSizeId,
              colorId: delta.colorId,
            },
          },
          create: {
            warehouseId: purchase.warehouseId,
            productSizeId: input.productSizeId,
            colorId: delta.colorId,
            quantity: delta.quantity,
          },
          update: { quantity: { increment: delta.quantity } },
        });
      }
    } else {
      const noColorId = await this.getNoColorId(tx);
      await tx.inventoryBalance.upsert({
        where: {
          warehouseId_productSizeId_colorId: {
            warehouseId: purchase.warehouseId,
            productSizeId: input.productSizeId,
            colorId: noColorId,
          },
        },
        create: {
          warehouseId: purchase.warehouseId,
          productSizeId: input.productSizeId,
          colorId: noColorId,
          quantity: input.quantity,
        },
        update: { quantity: { increment: input.quantity } },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        warehouseId: purchase.warehouseId,
        productSizeId: input.productSizeId,
        colorId: input.colorDeltas?.[0]?.colorId ?? (await this.getNoColorId(tx)),
        direction: 'IN',
        quantity: input.quantity,
        movementType: 'PURCHASE',
        referenceId: purchase.id,
        referenceType: 'Purchase',
        occurredAt: new Date(),
        createdById,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async revertPurchaseLineStock(
    tx: any,
    purchase: { warehouseId: string },
    line: {
      productSizeId: string;
      quantity: number;
      hasColorBreakdown: boolean;
      colorDeltas: Array<{ colorId: string; quantity: number }>;
    },
  ) {
    if (line.hasColorBreakdown && line.colorDeltas.length > 0) {
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
      return;
    }

    const noColorId = await this.getNoColorId(tx);
    await tx.inventoryBalance.update({
      where: {
        warehouseId_productSizeId_colorId: {
          warehouseId: purchase.warehouseId,
          productSizeId: line.productSizeId,
          colorId: noColorId,
        },
      },
      data: { quantity: { decrement: line.quantity } },
    });
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
