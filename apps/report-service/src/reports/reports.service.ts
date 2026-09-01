import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';
import {
  buildCajaIngresosBreakdown,
  buildDailyBreakdown,
  buildDailyCajaEntries,
  buildHourlyCajaChart,
  DIGITAL_PAYMENT_METHODS,
  round2,
  sumPaymentBreakdownByMethods,
} from './reports-sales.util';

const COMPLETED_SALE_STATUS = 'COMPLETED';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  private completedSaleFilter(warehouseId: string, dateRange: { gte: Date; lte: Date }) {
    return {
      warehouseId,
      isDeleted: false,
      status: COMPLETED_SALE_STATUS,
      createdAt: dateRange,
    };
  }

  private async getStoreIncomeMovements(
    warehouseId: string,
    start: Date,
    end: Date,
  ) {
    return this.db.cashMovement.findMany({
      where: {
        warehouseId,
        isDeleted: false,
        category: 'STORE',
        type: 'INCOME',
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        amount: true,
        paymentMethod: true,
        description: true,
      },
    });
  }

  // ── Sales Daily Report ──────────────────────────────────────────────────────
  async getDailySalesReport(date: string, warehouseId: string) {
    const start = dayjs(date).startOf('day').toDate();
    const end = dayjs(date).endOf('day').toDate();

    const [sales, storeIncomes] = await Promise.all([
      this.db.sale.findMany({
        where: this.completedSaleFilter(warehouseId, { gte: start, lte: end }),
        include: {
          customer: { select: { name: true } },
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.getStoreIncomeMovements(warehouseId, start, end),
    ]);

    const paymentBreakdown = buildCajaIngresosBreakdown(sales, storeIncomes);
    const totalAmount = paymentBreakdown.reduce((sum, row) => sum + row.amount, 0);
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalStoreIncomes = storeIncomes.reduce(
      (sum, movement) => sum + Number(movement.amount),
      0,
    );
    const itemsSold = sales.reduce(
      (sum, sale) => sum + sale.details.reduce((itemSum, item) => itemSum + (item.quantity ?? 0), 0),
      0,
    );
    const transactionCount = sales.length + storeIncomes.length;
    const cash = sumPaymentBreakdownByMethods(paymentBreakdown, ['CASH']);
    const digital = sumPaymentBreakdownByMethods(paymentBreakdown, DIGITAL_PAYMENT_METHODS);

    return {
      date: dayjs(date).format('DD/MM/YYYY'),
      dateIso: date,
      summary: {
        totalAmount: round2(totalAmount),
        totalSales: round2(totalSales),
        totalStoreIncomes: round2(totalStoreIncomes),
        transactionCount,
        itemsSold,
        averageTicket: transactionCount > 0 ? round2(totalAmount / transactionCount) : 0,
        cash,
        digital,
      },
      paymentBreakdown,
      hourlyChart: buildHourlyCajaChart(sales, storeIncomes),
      sales: buildDailyCajaEntries(sales, storeIncomes),
    };
  }

  // ── Sales Monthly Report ────────────────────────────────────────────────────
  async getMonthlySalesReport(month: string, warehouseId: string) {
    const monthStart = dayjs(`${month}-01`).startOf('month').toDate();
    const monthEnd = dayjs(`${month}-01`).endOf('month').toDate();

    const [sales, storeIncomes] = await Promise.all([
      this.db.sale.findMany({
        where: this.completedSaleFilter(warehouseId, { gte: monthStart, lte: monthEnd }),
        include: {
          customer: { select: { name: true } },
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.getStoreIncomeMovements(warehouseId, monthStart, monthEnd),
    ]);

    const paymentBreakdown = buildCajaIngresosBreakdown(sales, storeIncomes);
    const totalAmount = paymentBreakdown.reduce((sum, row) => sum + row.amount, 0);
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalStoreIncomes = storeIncomes.reduce(
      (sum, movement) => sum + Number(movement.amount),
      0,
    );
    const itemsSold = sales.reduce(
      (sum, sale) => sum + sale.details.reduce((itemSum, item) => itemSum + (item.quantity ?? 0), 0),
      0,
    );
    const transactionCount = sales.length + storeIncomes.length;
    const cash = sumPaymentBreakdownByMethods(paymentBreakdown, ['CASH']);
    const digital = sumPaymentBreakdownByMethods(paymentBreakdown, DIGITAL_PAYMENT_METHODS);
    const dailyBreakdown = buildDailyBreakdown(
      sales,
      storeIncomes,
      dayjs(`${month}-01`).format('YYYY-MM-DD'),
      dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD'),
    );
    const daysWithSales = dailyBreakdown.filter((row) => row.transactions > 0).length;

    return {
      monthIso: month,
      monthLabel: dayjs(`${month}-01`).format('MMMM YYYY'),
      summary: {
        totalAmount: round2(totalAmount),
        totalSales: round2(totalSales),
        totalStoreIncomes: round2(totalStoreIncomes),
        transactionCount,
        itemsSold,
        averageTicket: transactionCount > 0 ? round2(totalAmount / transactionCount) : 0,
        cash,
        digital,
        averageDaily: daysWithSales > 0 ? round2(totalAmount / daysWithSales) : 0,
        daysWithSales,
      },
      paymentBreakdown,
      dailyBreakdown,
      dailyChart: {
        labels: dailyBreakdown.map((row) => row.date),
        amounts: dailyBreakdown.map((row) => row.total),
      },
    };
  }

  // ── Sales Period Report ─────────────────────────────────────────────────────
  async getPeriodSalesReport(startDate: string, endDate: string, warehouseId: string) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const [sales, storeIncomes] = await Promise.all([
      this.db.sale.findMany({
        where: this.completedSaleFilter(warehouseId, { gte: start, lte: end }),
        include: {
          customer: { select: { name: true } },
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.getStoreIncomeMovements(warehouseId, start, end),
    ]);

    const paymentBreakdown = buildCajaIngresosBreakdown(sales, storeIncomes);
    const totalAmount = paymentBreakdown.reduce((sum, row) => sum + row.amount, 0);
    const totalSales = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalStoreIncomes = storeIncomes.reduce(
      (sum, movement) => sum + Number(movement.amount),
      0,
    );
    const itemsSold = sales.reduce(
      (sum, sale) => sum + sale.details.reduce((itemSum, item) => itemSum + (item.quantity ?? 0), 0),
      0,
    );
    const transactionCount = sales.length + storeIncomes.length;
    const cash = sumPaymentBreakdownByMethods(paymentBreakdown, ['CASH']);
    const digital = sumPaymentBreakdownByMethods(paymentBreakdown, DIGITAL_PAYMENT_METHODS);
    const dailyBreakdown = buildDailyBreakdown(sales, storeIncomes, startDate, endDate);
    const daysWithSales = dailyBreakdown.filter((row) => row.transactions > 0).length;
    const daysInRange = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

    return {
      startDate,
      endDate,
      periodLabel: `${dayjs(startDate).format('DD/MM/YYYY')} – ${dayjs(endDate).format('DD/MM/YYYY')}`,
      summary: {
        totalAmount: round2(totalAmount),
        totalSales: round2(totalSales),
        totalStoreIncomes: round2(totalStoreIncomes),
        transactionCount,
        itemsSold,
        averageTicket: transactionCount > 0 ? round2(totalAmount / transactionCount) : 0,
        cash,
        digital,
        averageDaily: daysWithSales > 0 ? round2(totalAmount / daysWithSales) : 0,
        daysWithSales,
        daysInRange,
      },
      paymentBreakdown,
      dailyBreakdown,
    };
  }

  // ── Products Inventory Report ───────────────────────────────────────────────
  async getProductsInventory(warehouseId: string) {
    const [products, balances] = await Promise.all([
      this.db.product.findMany({
        where: { warehouseId, isDeleted: false },
        orderBy: { name: 'asc' },
        include: {
          productSizes: {
            where: { isDeleted: false },
            include: {
              size: { select: { id: true, description: true } },
              productSizeColors: {
                include: {
                  color: { select: { id: true, description: true, isDeleted: true } },
                },
              },
            },
          },
        },
      }),
      this.db.inventoryBalance.findMany({
        where: { warehouseId },
        select: {
          productSizeId: true,
          colorId: true,
          quantity: true,
        },
      }),
    ]);

    const stockMap = new Map<string, number>();
    for (const balance of balances) {
      const key = `${balance.productSizeId}:${balance.colorId}`;
      stockMap.set(key, balance.quantity);
    }

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sizes: [...product.productSizes]
        .sort((a, b) =>
          (a.size.description ?? '').localeCompare(b.size.description ?? '', 'es'),
        )
        .map((productSize) => {
          const resolvedColors = [...productSize.productSizeColors]
            .map((entry) => entry.color)
            .filter(
              (color): color is { id: string; description: string; isDeleted: boolean } =>
                color != null && !color.isDeleted,
            )
            .sort((a, b) => a.description.localeCompare(b.description, 'es'))
            .map((color) => ({
              color_id: color.id,
              color: color.description,
              stock: stockMap.get(`${productSize.id}:${color.id}`) ?? 0,
            }));

          const stock = resolvedColors.length
            ? resolvedColors.reduce((sum, color) => sum + color.stock, 0)
            : [...stockMap.entries()]
                .filter(([key]) => key.startsWith(`${productSize.id}:`))
                .reduce((sum, [, quantity]) => sum + quantity, 0);

          return {
            product_size_id: productSize.id,
            size_id: productSize.sizeId,
            size: this.formatSizeLabel(productSize.size.description),
            barcode: productSize.barcode?.trim() ? productSize.barcode : null,
            purchase_price: productSize.purchasePrice != null
              ? Number(productSize.purchasePrice)
              : null,
            sale_price: productSize.salePrice != null
              ? Number(productSize.salePrice)
              : null,
            min_sale_price: productSize.minSalePrice != null
              ? Number(productSize.minSalePrice)
              : null,
            stock,
            colors: resolvedColors,
          };
        }),
    }));
  }

  private formatSizeLabel(description?: string | null): string {
    if (!description?.trim()) {
      return '—';
    }

    return description.replace(/estándar/gi, 'STD').replace(/estandar/gi, 'STD');
  }
}
