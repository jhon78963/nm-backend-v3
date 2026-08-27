import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { AiStockAgingService } from './ai-stock-aging.service';

export interface AiProductContext {
  product_id: string;
  product_name: string;
  current_cost: number;
  category: string;
  sales_last_month: number;
  current_stock: number;
  sale_price: number;
  can_view_cost: boolean;
  product_age_days: number;
  days_since_last_sale: number;
  total_sales_all_time: number;
  is_dead_stock: boolean;
  dead_stock_tier: string;
  dead_stock_label: string;
}

interface ProductSalesStats {
  salesLastMonth: number;
  totalSalesAllTime: number;
  lastSaleAt: Date | null;
}

@Injectable()
export class AiProductContextService {
  constructor(
    private readonly db: DatabaseService,
    private readonly stockAging: AiStockAgingService,
  ) {}

  async buildContext(
    productId: string,
    warehouseId: string,
    canViewCost: boolean,
  ): Promise<AiProductContext> {
    const map = await this.buildContextMap([productId], warehouseId, canViewCost);
    const context = map[productId];

    if (!context) {
      throw new NotFoundException('Producto no encontrado para contexto de IA.');
    }

    return context;
  }

  async buildContextMap(
    productIds: string[],
    warehouseId: string,
    canViewCost: boolean,
  ): Promise<Record<string, AiProductContext>> {
    const uniqueIds = [...new Set(productIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return {};
    }

    const products = await this.db.product.findMany({
      where: { id: { in: uniqueIds }, isDeleted: false },
      include: {
        gender: { select: { name: true } },
        productSizes: {
          where: { isDeleted: false },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (products.length === 0) {
      return {};
    }

    const sizeIds = products.flatMap((product) => product.productSizes.map((size) => size.id));
    const salesStats = await this.loadSalesStats(sizeIds, warehouseId);
    const stockByProduct = await this.loadStockByProduct(sizeIds, warehouseId, products);

    const contextMap: Record<string, AiProductContext> = {};
    const now = Date.now();

    for (const product of products) {
      const primarySize = product.productSizes[0];
      if (!primarySize) {
        continue;
      }

      const productSizeIds = product.productSizes.map((size) => size.id);
      const stats = this.aggregateStats(productSizeIds, salesStats);
      const productAgeDays = Math.max(
        0,
        Math.floor((now - product.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      const daysSinceLastSale = stats.lastSaleAt
        ? Math.max(0, Math.floor((now - stats.lastSaleAt.getTime()) / (1000 * 60 * 60 * 24)))
        : productAgeDays;

      const aging = this.stockAging.evaluate({
        productAgeDays,
        daysSinceLastSale,
        salesLastMonth: stats.salesLastMonth,
        currentStock: stockByProduct[product.id] ?? 0,
        totalSalesAllTime: stats.totalSalesAllTime,
      });

      contextMap[product.id] = {
        product_id: product.id,
        product_name: product.name,
        current_cost: canViewCost ? Number(primarySize.purchasePrice) : 0,
        category: product.gender.name,
        sales_last_month: stats.salesLastMonth,
        current_stock: stockByProduct[product.id] ?? 0,
        sale_price: Number(primarySize.salePrice),
        can_view_cost: canViewCost,
        product_age_days: productAgeDays,
        days_since_last_sale: daysSinceLastSale,
        total_sales_all_time: stats.totalSalesAllTime,
        is_dead_stock: aging.isDeadStock,
        dead_stock_tier: aging.deadStockTier,
        dead_stock_label: aging.deadStockLabel,
      };
    }

    return contextMap;
  }

  toPriceEnginePayload(context: AiProductContext) {
    return {
      product_id: context.product_id,
      current_cost: context.current_cost,
      current_sale_price: context.sale_price,
      category: context.category,
      sales_last_month: context.sales_last_month,
      current_stock: context.current_stock,
      product_age_days: context.product_age_days,
      days_since_last_sale: context.days_since_last_sale,
      total_sales_all_time: context.total_sales_all_time,
    };
  }

  toDemandEnginePayload(context: AiProductContext, horizonDays: number) {
    return {
      product_id: context.product_id,
      current_stock: context.current_stock,
      horizon_days: horizonDays,
      sales_last_month: context.sales_last_month,
      product_age_days: context.product_age_days,
      days_since_last_sale: context.days_since_last_sale,
      total_sales_all_time: context.total_sales_all_time,
    };
  }

  private async loadSalesStats(
    sizeIds: string[],
    warehouseId: string,
  ): Promise<Map<string, ProductSalesStats>> {
    const statsMap = new Map<string, ProductSalesStats>();
    if (sizeIds.length === 0) {
      return statsMap;
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const saleDetails = await this.db.saleDetail.findMany({
      where: {
        productSizeId: { in: sizeIds },
        sale: {
          status: 'COMPLETED',
          isDeleted: false,
          warehouseId,
        },
      },
      select: {
        productSizeId: true,
        quantity: true,
        sale: { select: { createdAt: true } },
      },
    });

    for (const detail of saleDetails) {
      const current = statsMap.get(detail.productSizeId) ?? {
        salesLastMonth: 0,
        totalSalesAllTime: 0,
        lastSaleAt: null,
      };

      current.totalSalesAllTime += detail.quantity;
      if (detail.sale.createdAt >= thirtyDaysAgo) {
        current.salesLastMonth += detail.quantity;
      }
      if (!current.lastSaleAt || detail.sale.createdAt > current.lastSaleAt) {
        current.lastSaleAt = detail.sale.createdAt;
      }

      statsMap.set(detail.productSizeId, current);
    }

    return statsMap;
  }

  private async loadStockByProduct(
    sizeIds: string[],
    warehouseId: string,
    products: Array<{ id: string; productSizes: Array<{ id: string }> }>,
  ): Promise<Record<string, number>> {
    const stockByProduct: Record<string, number> = {};
    if (sizeIds.length === 0) {
      return stockByProduct;
    }

    const balances = await this.db.inventoryBalance.groupBy({
      by: ['productSizeId'],
      where: { warehouseId, productSizeId: { in: sizeIds } },
      _sum: { quantity: true },
    });

    const stockBySize = new Map(
      balances.map((row) => [row.productSizeId, row._sum.quantity ?? 0]),
    );

    for (const product of products) {
      stockByProduct[product.id] = product.productSizes.reduce(
        (sum, size) => sum + (stockBySize.get(size.id) ?? 0),
        0,
      );
    }

    return stockByProduct;
  }

  private aggregateStats(
    productSizeIds: string[],
    salesStats: Map<string, ProductSalesStats>,
  ): ProductSalesStats {
    return productSizeIds.reduce<ProductSalesStats>(
      (acc, sizeId) => {
        const stats = salesStats.get(sizeId);
        if (!stats) {
          return acc;
        }

        acc.salesLastMonth += stats.salesLastMonth;
        acc.totalSalesAllTime += stats.totalSalesAllTime;
        if (stats.lastSaleAt && (!acc.lastSaleAt || stats.lastSaleAt > acc.lastSaleAt)) {
          acc.lastSaleAt = stats.lastSaleAt;
        }

        return acc;
      },
      { salesLastMonth: 0, totalSalesAllTime: 0, lastSaleAt: null },
    );
  }
}
