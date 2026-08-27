import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { Prisma } from '@prisma/client';
import {
  buildMasterStockByProductSizeId,
  readColorStock,
  reconcileMasterStock,
  syncMasterBalanceToColorSum,
} from '@app/common/utils/product-inventory.util';
import type { BulkUpdateReconciliationDto } from './dto/bulk-update-reconciliation.dto';
import type { ReplaceVariantColorDto } from './dto/replace-variant-color.dto';

const PRODUCT_INCLUDE = {
  gender: { select: { id: true, name: true } },
  productSizes: {
    where: { isDeleted: false },
    include: {
      size: { select: { id: true, description: true } },
      productSizeColors: {
        include: {
          color: { select: { id: true, description: true, hash: true } },
        },
      },
      inventoryBalances: {
        select: { colorId: true, quantity: true, warehouseId: true },
      },
    },
  },
} satisfies Prisma.ProductInclude;

type ReconciliationProductRecord = Prisma.ProductGetPayload<{
  include: typeof PRODUCT_INCLUDE;
}>;

@Injectable()
export class ReconciliationService {
  constructor(private readonly db: DatabaseService) {}

  async search(q: string, warehouseId: string) {
    const term = q.trim();
    if (!term) {
      return { products: [] };
    }

    const noColorId = await this.getNoColorId();
    const products = await this.db.product.findMany({
      where: this.buildSearchWhere(term, warehouseId),
      include: PRODUCT_INCLUDE,
      take: 20,
      orderBy: { name: 'asc' },
    });

    const productSizeIds = products.flatMap((product) =>
      product.productSizes.map((ps) => ps.id),
    );
    const masterStockBySizeId = await buildMasterStockByProductSizeId(
      this.db,
      warehouseId,
      productSizeIds,
    );

    return {
      products: products.map((product) =>
        this.mapReconciliationProduct(
          product,
          warehouseId,
          noColorId,
          masterStockBySizeId,
        ),
      ),
    };
  }

  async getProduct(productId: string, warehouseId: string) {
    const noColorId = await this.getNoColorId();
    const product = await this.db.product.findFirst({
      where: { id: productId, isDeleted: false, warehouseId },
      include: PRODUCT_INCLUDE,
    });

    if (!product) return null;

    const masterStockBySizeId = await buildMasterStockByProductSizeId(
      this.db,
      warehouseId,
      product.productSizes.map((ps) => ps.id),
    );

    return this.mapReconciliationProduct(
      product,
      warehouseId,
      noColorId,
      masterStockBySizeId,
    );
  }

  async getPosSalesSince(productId: string, warehouseId: string) {
    const productSizes = await this.db.productSize.findMany({
      where: { productId, isDeleted: false },
      select: { id: true },
    });
    const psIds = productSizes.map((ps) => ps.id);

    const sales = await this.db.saleDetail.groupBy({
      by: ['productSizeId', 'colorId'],
      where: {
        productSizeId: { in: psIds },
        sale: { warehouseId, isDeleted: false },
      },
      _sum: { quantity: true },
    });

    return {
      productId,
      salesByVariant: sales.map((s) => ({
        productSizeId: s.productSizeId,
        colorId: s.colorId ?? null,
        totalSold: s._sum.quantity ?? 0,
      })),
    };
  }

  async bulkUpdate(
    productId: string,
    warehouseId: string,
    body: BulkUpdateReconciliationDto,
  ) {
    const product = await this.db.product.findFirst({
      where: { id: productId, warehouseId, isDeleted: false },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const sizes = body.sizes ?? [];
    let updatedVariants = 0;

    await this.db.$transaction(async (tx) => {
      for (const size of sizes) {
        const productSize = await tx.productSize.findFirst({
          where: { id: size.id, productId, isDeleted: false },
          select: { id: true },
        });
        if (!productSize) continue;

        const sizeData: Prisma.ProductSizeUpdateInput = {};
        if (size.barcode !== undefined) {
          sizeData.barcode = size.barcode;
        }
        if (size.purchasePrice != null) {
          sizeData.purchasePrice = size.purchasePrice;
        }
        if (size.salePrice != null) {
          sizeData.salePrice = size.salePrice;
        }
        if (size.minSalePrice != null) {
          sizeData.minSalePrice = size.minSalePrice;
        }
        if (Object.keys(sizeData).length > 0) {
          await tx.productSize.update({
            where: { id: size.id },
            data: sizeData,
          });
        }

        if (size.colors && size.colors.length > 0) {
          for (const color of size.colors) {
            const quantity = Math.max(0, Math.trunc(color.stock));
            await tx.inventoryBalance.upsert({
              where: {
                warehouseId_productSizeId_colorId: {
                  warehouseId,
                  productSizeId: size.id,
                  colorId: color.colorId,
                },
              },
              update: { quantity },
              create: {
                warehouseId,
                productSizeId: size.id,
                colorId: color.colorId,
                quantity,
              },
            });
            updatedVariants += 1;
          }
          await syncMasterBalanceToColorSum(tx, warehouseId, size.id);
        } else if (size.stock !== undefined) {
          await reconcileMasterStock(tx, warehouseId, size.id, size.stock);
          updatedVariants += 1;
        }
      }
    });

    const refreshed = await this.getProduct(productId, warehouseId);

    return {
      message: `Inventario actualizado para ${updatedVariants} variante(s).`,
      product: refreshed,
    };
  }

  async replaceVariantColor(
    productId: string,
    productSizeId: string,
    warehouseId: string,
    dto: ReplaceVariantColorDto,
  ) {
    const { fromColorId, toColorId } = dto;

    if (fromColorId === toColorId) {
      throw new BadRequestException('El color destino debe ser distinto al actual.');
    }

    const productSize = await this.db.productSize.findFirst({
      where: {
        id: productSizeId,
        productId,
        isDeleted: false,
        product: { warehouseId, isDeleted: false },
      },
      include: { product: { select: { id: true, warehouseId: true } } },
    });
    if (!productSize) {
      throw new NotFoundException('Talla no encontrada.');
    }

    const fromLink = await this.db.productSizeColor.findFirst({
      where: { productSizeId, colorId: fromColorId },
    });
    if (!fromLink) {
      throw new NotFoundException('Este color no está asignado a la talla seleccionada.');
    }

    const toColor = await this.db.color.findFirst({
      where: { id: toColorId, isDeleted: false },
      select: { id: true },
    });
    if (!toColor) {
      throw new NotFoundException('Color destino no encontrado.');
    }

    const wh = productSize.product.warehouseId;

    await this.db.$transaction(async (tx) => {
      const preservedStock = await readColorStock(tx, wh, productSizeId, fromColorId);

      await tx.productSizeColor.delete({ where: { id: fromLink.id } });
      await tx.inventoryBalance.deleteMany({
        where: { warehouseId: wh, productSizeId, colorId: fromColorId },
      });

      const existingToLink = await tx.productSizeColor.findFirst({
        where: { productSizeId, colorId: toColorId },
      });
      if (!existingToLink) {
        await tx.productSizeColor.create({
          data: { productSizeId, colorId: toColorId },
        });
      }

      const targetStock = existingToLink
        ? preservedStock + (await readColorStock(tx, wh, productSizeId, toColorId))
        : preservedStock;

      await tx.inventoryBalance.upsert({
        where: {
          warehouseId_productSizeId_colorId: {
            warehouseId: wh,
            productSizeId,
            colorId: toColorId,
          },
        },
        update: { quantity: targetStock },
        create: {
          warehouseId: wh,
          productSizeId,
          colorId: toColorId,
          quantity: targetStock,
        },
      });

      await syncMasterBalanceToColorSum(tx, wh, productSizeId);
    });

    const product = await this.getProduct(productId, warehouseId);

    return {
      message: 'Color de la variante actualizado; el stock se mantuvo en la nueva etiqueta.',
      product,
    };
  }

  private buildSearchWhere(
    term: string,
    warehouseId: string,
  ): Prisma.ProductWhereInput {
    const barcodeTerm = term.replace(/\s+/g, '');
    const isNumeric = /^\d+$/.test(barcodeTerm);
    const or: Prisma.ProductWhereInput[] = [
      { name: { contains: term, mode: 'insensitive' } },
      { barcode: { contains: term, mode: 'insensitive' } },
      {
        productSizes: {
          some: {
            isDeleted: false,
            barcode: { contains: term, mode: 'insensitive' },
          },
        },
      },
    ];

    if (isNumeric) {
      or.push(
        { barcode: { endsWith: barcodeTerm } },
        {
          productSizes: {
            some: {
              isDeleted: false,
              barcode: { endsWith: barcodeTerm },
            },
          },
        },
        { barcode: barcodeTerm },
        {
          productSizes: {
            some: {
              isDeleted: false,
              barcode: barcodeTerm,
            },
          },
        },
      );
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(term)) {
      or.push({ id: term });
    }

    return {
      isDeleted: false,
      warehouseId,
      OR: or,
    };
  }

  private mapReconciliationProduct(
    product: ReconciliationProductRecord,
    warehouseId: string,
    noColorId: string | null,
    masterStockBySizeId: Map<string, number>,
  ) {
    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      genderId: product.genderId,
      gender: product.gender?.name ?? null,
      warehouseId: product.warehouseId,
      status: product.status,
      sizes: product.productSizes.map((ps) => {
        const warehouseBalances = ps.inventoryBalances.filter(
          (balance) => balance.warehouseId === warehouseId,
        );
        const balanceMap = new Map(
          warehouseBalances.map((balance) => [balance.colorId, balance.quantity]),
        );

        const colors = ps.productSizeColors.map((psc) => {
          const stock = balanceMap.get(psc.colorId) ?? 0;
          return {
            id: psc.colorId,
            colorId: psc.colorId,
            description: psc.color.description,
            hash: psc.color.hash,
            stock,
            inventory: {
              availableQuantity: stock,
              warehouseId,
            },
          };
        });

        const stock = masterStockBySizeId.get(ps.id) ?? 0;

        return {
          id: ps.id,
          sizeId: ps.sizeId,
          barcode: ps.barcode,
          stock,
          purchasePrice: Number(ps.purchasePrice),
          salePrice: Number(ps.salePrice),
          minSalePrice:
            ps.minSalePrice != null ? Number(ps.minSalePrice) : null,
          size: ps.size
            ? { id: ps.size.id, description: ps.size.description }
            : null,
          colors,
          inventory: {
            availableQuantity: stock,
            warehouseId,
          },
        };
      }),
    };
  }

  private async getNoColorId(): Promise<string | null> {
    const color = await this.db.color.findFirst({
      where: { description: 'Sin color', isDeleted: false },
      select: { id: true },
    });
    return color?.id ?? null;
  }
}
