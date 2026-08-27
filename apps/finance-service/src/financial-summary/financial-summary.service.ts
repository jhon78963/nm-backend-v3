import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

const OPERATING_EXPENSE_CATEGORIES = ['ADMINISTRATIVE', 'STORE'] as const;
const STOCK_INVESTMENT_TYPES = ['INITIAL_INVENTORY', 'PURCHASE', 'RECONCILIATION'] as const;

@Injectable()
export class FinancialSummaryService {
  constructor(private readonly db: DatabaseService) {}

  async getSummary(warehouseId: string, month?: string) {
    const currentMonth = month ?? dayjs().format('YYYY-MM');
    const startOfMonth = dayjs(currentMonth, 'YYYY-MM').startOf('month').toDate();
    const endOfMonth = dayjs(currentMonth, 'YYYY-MM').endOf('month').toDate();
    const lastMonthStart = dayjs(currentMonth, 'YYYY-MM')
      .subtract(1, 'month')
      .startOf('month')
      .toDate();
    const lastMonthEnd = dayjs(currentMonth, 'YYYY-MM')
      .subtract(1, 'month')
      .endOf('month')
      .toDate();

    const saleScope = {
      warehouseId,
      isDeleted: false,
      status: 'COMPLETED',
    };

    const [
      totalSalesAllTimeAgg,
      totalIncomesAllTimeAgg,
      totalExpensesAllTimeAgg,
      cashSalesAgg,
      monthlySalesAgg,
      lastMonthSalesAgg,
      monthlyExpensesAgg,
      monthlyAdministrativeAgg,
      monthlyStoreAgg,
      recentSales,
      recentMovements,
      stockInvestmentRows,
    ] = await Promise.all([
      this.db.sale.aggregate({
        where: saleScope,
        _sum: { totalAmount: true },
      }),
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: {
          warehouseId,
          isDeleted: false,
          type: 'EXPENSE',
          category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
        },
        _sum: { amount: true },
      }),
      this.db.sale.aggregate({
        where: { ...saleScope, paymentMethod: 'CASH' },
        _sum: { totalAmount: true },
      }),
      this.db.sale.aggregate({
        where: {
          ...saleScope,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      this.db.sale.aggregate({
        where: {
          ...saleScope,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { totalAmount: true },
      }),
      this.db.cashMovement.aggregate({
        where: {
          warehouseId,
          isDeleted: false,
          type: 'EXPENSE',
          category: { in: [...OPERATING_EXPENSE_CATEGORIES] },
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: {
          warehouseId,
          isDeleted: false,
          type: 'EXPENSE',
          category: 'ADMINISTRATIVE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: {
          warehouseId,
          isDeleted: false,
          type: 'EXPENSE',
          category: 'STORE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.db.sale.findMany({
        where: saleScope,
        select: {
          id: true,
          code: true,
          createdAt: true,
          paymentMethod: true,
          totalAmount: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.db.cashMovement.findMany({
        where: { warehouseId, isDeleted: false },
        select: {
          id: true,
          description: true,
          type: true,
          category: true,
          date: true,
          paymentMethod: true,
          amount: true,
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      this.db.inventoryMovement.findMany({
        where: {
          warehouseId,
          direction: 'IN',
          movementType: { in: [...STOCK_INVESTMENT_TYPES] },
          occurredAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          quantity: true,
          productSize: { select: { purchasePrice: true } },
        },
      }),
    ]);

    const totalSalesAllTime = Number(totalSalesAllTimeAgg._sum.totalAmount ?? 0);
    const totalIncomesAllTime = Number(totalIncomesAllTimeAgg._sum.amount ?? 0);
    const totalExpensesAllTime = Number(totalExpensesAllTimeAgg._sum.amount ?? 0);
    const baseCash = 100;
    const currentCash =
      baseCash + totalSalesAllTime + totalIncomesAllTime - totalExpensesAllTime;
    const cashSales = Number(cashSalesAgg._sum.totalAmount ?? 0);
    const digitalSales = totalSalesAllTime - cashSales;

    const monthlySales = Number(monthlySalesAgg._sum.totalAmount ?? 0);
    const lastMonthSales = Number(lastMonthSalesAgg._sum.totalAmount ?? 0);
    const growthPercentage =
      lastMonthSales > 0
        ? round1(((monthlySales - lastMonthSales) / lastMonthSales) * 100)
        : 100;

    const monthlyExpenses = Number(monthlyExpensesAgg._sum.amount ?? 0);
    const monthlyAdministrativeExpenses = Number(
      monthlyAdministrativeAgg._sum.amount ?? 0,
    );
    const monthlyStoreExpenses = Number(monthlyStoreAgg._sum.amount ?? 0);

    const monthlyInvestment = stockInvestmentRows.reduce(
      (sum, row) =>
        sum + row.quantity * Number(row.productSize.purchasePrice ?? 0),
      0,
    );

    const recentTransactions = [
      ...recentSales.map((sale) => ({
        id: sale.id,
        concept: `Venta POS #${sale.code ?? sale.id}`,
        category: 'Venta',
        date: dayjs(sale.createdAt).format('DD/MM/YYYY hh:mm A'),
        method: sale.paymentMethod,
        amount: Number(sale.totalAmount),
        type: 'income' as const,
        sortDate: sale.createdAt,
      })),
      ...recentMovements.map((movement) => ({
        id: movement.id,
        concept: movement.description ?? 'Movimiento de caja',
        category: this.mapMovementCategory(movement.type, movement.category),
        date: dayjs(movement.date).format('DD/MM/YYYY hh:mm A'),
        method: movement.paymentMethod,
        amount: Number(movement.amount),
        type: movement.type === 'INCOME' ? ('income' as const) : ('expense' as const),
        sortDate: movement.date,
      })),
    ]
      .sort((a, b) => dayjs(b.sortDate).valueOf() - dayjs(a.sortDate).valueOf())
      .slice(0, 10)
      .map(({ sortDate: _sortDate, ...transaction }) => transaction);

    return {
      cards: {
        cash_total: {
          amount: round2(currentCash),
          cash: round2(cashSales),
          digital: round2(digitalSales),
        },
        sales_income: {
          amount: round2(monthlySales),
          growth: growthPercentage,
        },
        expenses: {
          amount: round2(monthlyExpenses),
          description: `Administrativos: S/ ${formatMoney(monthlyAdministrativeExpenses)} · Tienda: S/ ${formatMoney(monthlyStoreExpenses)}`,
        },
        stock_investment: {
          amount: round2(monthlyInvestment),
          description: 'Compras recuperables',
        },
      },
      recent_transactions: recentTransactions,
    };
  }

  private mapMovementCategory(type: string, category: string): string {
    if (type === 'INCOME') {
      return 'Ingreso';
    }

    if (category === 'ADMINISTRATIVE') {
      return 'Gasto administrativo';
    }

    return 'Gasto tienda';
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
