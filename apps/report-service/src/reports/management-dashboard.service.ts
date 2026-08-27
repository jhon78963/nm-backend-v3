import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

const OPERATING_EXPENSE_CATEGORIES = ['ADMINISTRATIVE', 'STORE'] as const;
const DIGITAL_PAYMENT_METHODS = ['YAPE', 'PLIN', 'CARD', 'TRANSFER'] as const;

interface MonthlyChannelRow {
  sortMonth: string;
  monthYear: string;
  cashAmount: number;
  digitalAmount: number;
}

@Injectable()
export class ManagementDashboardService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboard(
    startDate: string,
    endDate: string,
    warehouseId?: string,
  ) {
    const referenceDate = dayjs(startDate);
    const rangeStart = dayjs(startDate).startOf('day').toDate();
    const rangeEnd = dayjs(endDate).endOf('day').toDate();

    const [
      salesTotals,
      topProducts,
      leastProducts,
      financials,
      allTimeMonthlyReport,
      accumulatedGrowth,
    ] = await Promise.all([
      this.getSalesTotals(referenceDate, warehouseId),
      this.getTopProducts(100, rangeStart, rangeEnd, warehouseId),
      this.getLeastSoldProducts(100, rangeStart, rangeEnd, warehouseId),
      this.getFinancialReport(rangeStart, rangeEnd, warehouseId),
      this.getAllTimeMonthlyReport(warehouseId),
      this.getMonthlyGrowthReport(warehouseId),
    ]);

    return {
      success: true,
      data: {
        totals: salesTotals,
        top_products: topProducts,
        least_products: leastProducts,
        financials,
        all_time_monthly_report: allTimeMonthlyReport,
        accumulated_account_monthly_report: accumulatedGrowth.rows,
        accumulated_account_summary: {
          opening: accumulatedGrowth.opening,
          current: accumulatedGrowth.current,
        },
      },
    };
  }

  private saleScope(warehouseId?: string) {
    return {
      isDeleted: false,
      status: 'COMPLETED',
      ...(warehouseId ? { warehouseId } : {}),
    };
  }

  private async calculateNetBalance(
    start: Date,
    end: Date,
    warehouseId?: string,
  ): Promise<number> {
    const [salesAgg, movements] = await Promise.all([
      this.db.sale.aggregate({
        where: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      this.db.cashMovement.groupBy({
        by: ['type'],
        where: {
          isDeleted: false,
          date: { gte: start, lte: end },
          ...(warehouseId ? { warehouseId } : {}),
        },
        _sum: { amount: true },
      }),
    ]);

    const income = movements
      .filter((row) => row.type === 'INCOME')
      .reduce((sum, row) => sum + Number(row._sum.amount ?? 0), 0);

    const expenseRows = await this.db.cashMovement.aggregate({
      where: {
        isDeleted: false,
        type: 'EXPENSE',
        category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
        date: { gte: start, lte: end },
        ...(warehouseId ? { warehouseId } : {}),
      },
      _sum: { amount: true },
    });

    return (
      Number(salesAgg._sum.totalAmount ?? 0) +
      income -
      Number(expenseRows._sum.amount ?? 0)
    );
  }

  private async getSalesTotals(referenceDate: dayjs.Dayjs, warehouseId?: string) {
    const now = dayjs();
    const isCurrentMonth =
      referenceDate.year() === now.year() && referenceDate.month() === now.month();

    const monthStart = referenceDate.startOf('month').startOf('day').toDate();
    const monthEnd = referenceDate.endOf('month').endOf('day').toDate();

    const [daily, weekly, monthly] = await Promise.all([
      isCurrentMonth
        ? this.calculateNetBalance(
            now.startOf('day').toDate(),
            now.endOf('day').toDate(),
            warehouseId,
          )
        : Promise.resolve(0),
      isCurrentMonth
        ? this.calculateNetBalance(
            now.startOf('week').toDate(),
            now.endOf('week').toDate(),
            warehouseId,
          )
        : Promise.resolve(0),
      this.calculateNetBalance(monthStart, monthEnd, warehouseId),
    ]);

    return { daily, weekly, monthly };
  }

  private async getFinancialReport(
    start: Date,
    end: Date,
    warehouseId?: string,
  ) {
    const [salesAgg, otherIncomeAgg, expenseBreakdown, costOfGoods] =
      await Promise.all([
        this.db.sale.aggregate({
          where: {
            ...this.saleScope(warehouseId),
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
        }),
        this.db.cashMovement.aggregate({
          where: {
            isDeleted: false,
            type: 'INCOME',
            date: { gte: start, lte: end },
            ...(warehouseId ? { warehouseId } : {}),
          },
          _sum: { amount: true },
        }),
        this.db.cashMovement.groupBy({
          by: ['category'],
          where: {
            isDeleted: false,
            type: 'EXPENSE',
            category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
            date: { gte: start, lte: end },
            ...(warehouseId ? { warehouseId } : {}),
          },
          _sum: { amount: true },
        }),
        this.calculateCostOfGoods(start, end, warehouseId),
      ]);

    const salesRevenue =
      Number(salesAgg._sum.totalAmount ?? 0) +
      Number(otherIncomeAgg._sum.amount ?? 0);
    const administrativeExpenses = Number(
      expenseBreakdown.find((row) => row.category === 'ADMINISTRATIVE')?._sum
        .amount ?? 0,
    );
    const storeExpenses = Number(
      expenseBreakdown.find((row) => row.category === 'STORE')?._sum.amount ?? 0,
    );
    const operatingExpenses = administrativeExpenses + storeExpenses;
    const grossProfit = salesRevenue - costOfGoods;

    return {
      period: `${dayjs(start).format('DD/MM/YYYY')} - ${dayjs(end).format('DD/MM/YYYY')}`,
      sales_revenue: round2(salesRevenue),
      cost_of_goods: round2(costOfGoods),
      gross_profit: round2(grossProfit),
      administrative_expenses: round2(administrativeExpenses),
      store_expenses: round2(storeExpenses),
      operating_expenses: round2(operatingExpenses),
      net_utility: round2(grossProfit - operatingExpenses),
      chart_data: await this.getDailyChartData(start, end, warehouseId),
    };
  }

  private async calculateCostOfGoods(
    start: Date,
    end: Date,
    warehouseId?: string,
  ): Promise<number> {
    const details = await this.db.saleDetail.findMany({
      where: {
        sale: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
      },
      select: {
        quantity: true,
        productSizeId: true,
      },
    });

    if (!details.length) {
      return 0;
    }

    const productSizeIds = [...new Set(details.map((detail) => detail.productSizeId))];
    const productSizes = await this.db.productSize.findMany({
      where: { id: { in: productSizeIds } },
      select: { id: true, purchasePrice: true },
    });
    const priceBySize = new Map(
      productSizes.map((size) => [size.id, Number(size.purchasePrice)]),
    );

    return details.reduce((sum, detail) => {
      const purchasePrice = priceBySize.get(detail.productSizeId) ?? 0;
      return sum + detail.quantity * purchasePrice;
    }, 0);
  }

  private async getDailyChartData(
    start: Date,
    end: Date,
    warehouseId?: string,
  ) {
    const [sales, expenses] = await Promise.all([
      this.db.sale.findMany({
        where: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
        select: { createdAt: true, totalAmount: true },
      }),
      this.db.cashMovement.findMany({
        where: {
          isDeleted: false,
          type: 'EXPENSE',
          category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
          date: { gte: start, lte: end },
          ...(warehouseId ? { warehouseId } : {}),
        },
        select: { date: true, amount: true },
      }),
    ]);

    const salesByDay = new Map<string, number>();
    const expensesByDay = new Map<string, number>();

    for (const sale of sales) {
      const key = dayjs(sale.createdAt).format('YYYY-MM-DD');
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + Number(sale.totalAmount));
    }

    for (const expense of expenses) {
      const key = dayjs(expense.date).format('YYYY-MM-DD');
      expensesByDay.set(
        key,
        (expensesByDay.get(key) ?? 0) + Number(expense.amount),
      );
    }

    const labels: string[] = [];
    const salesData: number[] = [];
    const expensesData: number[] = [];

    for (
      let cursor = dayjs(start).startOf('day');
      cursor.isBefore(dayjs(end).endOf('day'));
      cursor = cursor.add(1, 'day')
    ) {
      const key = cursor.format('YYYY-MM-DD');
      labels.push(cursor.format('DD/MM'));
      salesData.push(round2(salesByDay.get(key) ?? 0));
      expensesData.push(round2(expensesByDay.get(key) ?? 0));
    }

    return { labels, sales: salesData, expenses: expensesData };
  }

  private async getTopProducts(
    limit: number,
    start: Date,
    end: Date,
    warehouseId?: string,
  ) {
    const grouped = await this.db.saleDetail.groupBy({
      by: ['productNameSnapshot'],
      where: {
        sale: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (!grouped.length) {
      return [];
    }

    const productNames = grouped.map((row) => row.productNameSnapshot);
    const variants = await this.db.saleDetail.groupBy({
      by: ['productNameSnapshot', 'colorSnapshot', 'sizeSnapshot'],
      where: {
        productNameSnapshot: { in: productNames },
        sale: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
    });

    return grouped.map((product) => {
      const productVariants = variants
        .filter((variant) => variant.productNameSnapshot === product.productNameSnapshot)
        .slice(0, 5);
      const topVariantsText = productVariants
        .map((variant) => {
          const size = (variant.sizeSnapshot ?? '')
            .replace(/ESTÁNDAR/gi, 'STD')
            .replace(/ESTANDAR/gi, 'STD');
          return `${variant._sum.quantity ?? 0}-${variant.colorSnapshot ?? '—'}(${size})`;
        })
        .join(' | ');

      return {
        name: product.productNameSnapshot,
        total_sold: Number(product._sum.quantity ?? 0),
        color: topVariantsText ? `Top: ${topVariantsText}` : 'Top: —',
      };
    });
  }

  private async getLeastSoldProducts(
    limit: number,
    start: Date,
    end: Date,
    warehouseId?: string,
  ) {
    const products = await this.db.product.findMany({
      where: {
        isDeleted: false,
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const soldByProduct = await this.db.saleDetail.groupBy({
      by: ['productSizeId'],
      where: {
        sale: {
          ...this.saleScope(warehouseId),
          createdAt: { gte: start, lte: end },
        },
      },
      _sum: { quantity: true },
    });

    const productSizeIds = soldByProduct.map((row) => row.productSizeId);
    const productSizes = productSizeIds.length
      ? await this.db.productSize.findMany({
          where: { id: { in: productSizeIds } },
          select: { id: true, productId: true },
        })
      : [];

    const soldByProductId = new Map<string, number>();
    for (const row of soldByProduct) {
      const productSize = productSizes.find((size) => size.id === row.productSizeId);
      if (!productSize) continue;
      soldByProductId.set(
        productSize.productId,
        (soldByProductId.get(productSize.productId) ?? 0) +
          Number(row._sum.quantity ?? 0),
      );
    }

    return products
      .map((product) => ({
        name: product.name,
        registration_date: dayjs(product.createdAt).format('DD/MM/YYYY'),
        total_sold: soldByProductId.get(product.id) ?? 0,
      }))
      .sort((a, b) => a.total_sold - b.total_sold || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  private async getAllTimeMonthlyReport(warehouseId?: string) {
    const salesChannels = await this.buildMonthlySalesChannels(warehouseId);
    const movementChannels = await this.buildMonthlyMovementChannels(warehouseId);

    const allMonths = [
      ...new Set([
        ...salesChannels.map((row) => row.sortMonth),
        ...movementChannels.map((row) => row.sortMonth),
      ]),
    ].sort();

    return allMonths.map((sortMonth) => {
      const saleData = salesChannels.find((row) => row.sortMonth === sortMonth);
      const movementData = movementChannels.find(
        (row) => row.sortMonth === sortMonth,
      );
      const cash =
        (saleData?.cashAmount ?? 0) + (movementData?.cashAmount ?? 0);
      const digital =
        (saleData?.digitalAmount ?? 0) + (movementData?.digitalAmount ?? 0);

      return {
        fecha:
          saleData?.monthYear ??
          dayjs(`${sortMonth}-01`).format('MM-YYYY'),
        sort_month: sortMonth,
        efectivo: round2(cash),
        bancos: round2(digital),
        total_mensual: round2(cash + digital),
      };
    });
  }

  private async buildMonthlySalesChannels(
    warehouseId?: string,
  ): Promise<MonthlyChannelRow[]> {
    const sales = await this.db.sale.findMany({
      where: this.saleScope(warehouseId),
      select: {
        createdAt: true,
        paymentMethod: true,
        totalAmount: true,
        payments: { select: { method: true, amount: true } },
      },
    });

    const byMonth = new Map<string, MonthlyChannelRow>();

    for (const sale of sales) {
      const sortMonth = dayjs(sale.createdAt).format('YYYY-MM');
      const monthYear = dayjs(sale.createdAt).format('MM-YYYY');
      const current = byMonth.get(sortMonth) ?? {
        sortMonth,
        monthYear,
        cashAmount: 0,
        digitalAmount: 0,
      };

      const payments =
        sale.payments.length > 0
          ? sale.payments
          : [{ method: sale.paymentMethod, amount: sale.totalAmount }];

      for (const payment of payments) {
        const amount = Number(payment.amount);
        if (payment.method === 'CASH') {
          current.cashAmount += amount;
        } else if (
          DIGITAL_PAYMENT_METHODS.includes(
            payment.method as (typeof DIGITAL_PAYMENT_METHODS)[number],
          )
        ) {
          current.digitalAmount += amount;
        }
      }

      byMonth.set(sortMonth, current);
    }

    return [...byMonth.values()];
  }

  private async buildMonthlyMovementChannels(warehouseId?: string) {
    const movements = await this.db.cashMovement.findMany({
      where: {
        isDeleted: false,
        category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        date: true,
        type: true,
        paymentMethod: true,
        amount: true,
      },
    });

    const byMonth = new Map<string, { sortMonth: string; cashAmount: number; digitalAmount: number }>();

    for (const movement of movements) {
      const sortMonth = dayjs(movement.date).format('YYYY-MM');
      const current = byMonth.get(sortMonth) ?? {
        sortMonth,
        cashAmount: 0,
        digitalAmount: 0,
      };
      const signedAmount =
        movement.type === 'INCOME'
          ? Number(movement.amount)
          : -Number(movement.amount);

      if (movement.paymentMethod === 'CASH') {
        current.cashAmount += signedAmount;
      } else if (
        DIGITAL_PAYMENT_METHODS.includes(
          movement.paymentMethod as (typeof DIGITAL_PAYMENT_METHODS)[number],
        )
      ) {
        current.digitalAmount += signedAmount;
      }

      byMonth.set(sortMonth, current);
    }

    return [...byMonth.values()];
  }

  private async getMonthlyGrowthReport(warehouseId?: string) {
    const setting = warehouseId
      ? await this.db.accumulatedAccountSetting.findUnique({
          where: { warehouseId },
        })
      : await this.db.accumulatedAccountSetting.findFirst();

    if (!setting) {
      return {
        rows: [],
        opening: { cash: 0, digital: 0, total: 0 },
        current: { cash: 0, digital: 0, total: 0 },
      };
    }

    const openingCash = Number(setting.cashBalance);
    const openingDigital = Number(setting.digitalBalance);
    const operationalRows = await this.getAllTimeMonthlyReport(warehouseId);
    const accumulatedOutflows = await this.getAccumulatedExpensesByMonth(
      warehouseId,
    );

    let runningCash = openingCash;
    let runningDigital = openingDigital;
    const rows: Array<{
      fecha: string;
      sort_month: string;
      efectivo: number;
      bancos: number;
      total_mensual: number;
      saldo_efectivo: number;
      saldo_bancos: number;
      saldo_total: number;
    }> = [];

    for (const row of operationalRows) {
      if (
        setting.trackingStartMonth &&
        row.sort_month < setting.trackingStartMonth
      ) {
        continue;
      }

      const outflow = accumulatedOutflows.get(row.sort_month) ?? {
        cashOut: 0,
        digitalOut: 0,
      };
      const netCash = row.efectivo - outflow.cashOut;
      const netDigital = row.bancos - outflow.digitalOut;
      runningCash += netCash;
      runningDigital += netDigital;

      rows.push({
        fecha: row.fecha,
        sort_month: row.sort_month,
        efectivo: round2(netCash),
        bancos: round2(netDigital),
        total_mensual: round2(netCash + netDigital),
        saldo_efectivo: round2(runningCash),
        saldo_bancos: round2(runningDigital),
        saldo_total: round2(runningCash + runningDigital),
      });
    }

    return {
      rows,
      opening: {
        cash: openingCash,
        digital: openingDigital,
        total: openingCash + openingDigital,
      },
      current: {
        cash: openingCash,
        digital: openingDigital,
        total: openingCash + openingDigital,
      },
    };
  }

  private async getAccumulatedExpensesByMonth(warehouseId?: string) {
    const expenses = await this.db.cashMovement.findMany({
      where: {
        isDeleted: false,
        type: 'EXPENSE',
        category: 'ACCUMULATED',
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        date: true,
        paymentMethod: true,
        amount: true,
      },
    });

    const byMonth = new Map<string, { cashOut: number; digitalOut: number }>();

    for (const expense of expenses) {
      const sortMonth = dayjs(expense.date).format('YYYY-MM');
      const current = byMonth.get(sortMonth) ?? { cashOut: 0, digitalOut: 0 };
      const amount = Number(expense.amount);

      if (expense.paymentMethod === 'CASH') {
        current.cashOut += amount;
      } else if (
        DIGITAL_PAYMENT_METHODS.includes(
          expense.paymentMethod as (typeof DIGITAL_PAYMENT_METHODS)[number],
        )
      ) {
        current.digitalOut += amount;
      }

      byMonth.set(sortMonth, current);
    }

    return byMonth;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
