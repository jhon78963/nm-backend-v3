import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { Prisma } from '@prisma/client';

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

    return {
      products: products.map((product) =>
        this.mapReconciliationProduct(product, warehouseId, noColorId),
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

    return this.mapReconciliationProduct(product, warehouseId, noColorId);
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
    updates: { colorId: string; productSizeId: string; stock: number }[],
  ) {
    const ops = updates.map((u) =>
      this.db.inventoryBalance.upsert({
        where: {
          warehouseId_productSizeId_colorId: {
            warehouseId,
            productSizeId: u.productSizeId,
            colorId: u.colorId,
          },
        },
        update: { quantity: u.stock },
        create: {
          warehouseId,
          productSizeId: u.productSizeId,
          colorId: u.colorId,
          quantity: u.stock,
        },
      }),
    );

    await this.db.$transaction(ops);
    return { message: `Inventario actualizado para ${updates.length} variante(s).` };
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

        const stock =
          colors.length > 0
            ? colors.reduce((sum, color) => sum + color.stock, 0)
            : noColorId
              ? balanceMap.get(noColorId) ?? 0
              : warehouseBalances.reduce((sum, balance) => sum + balance.quantity, 0);

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
