import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

/**
 * FinancialSummaryService — Equivale a FinancialSummaryService de Laravel.
 *
 * Consolida en una sola consulta:
 *   - Ventas del período (pos-service data)
 *   - Gastos/ingresos de caja (finance-service data)
 *   - Balance acumulado actual
 *   - Top categorías de gasto
 *
 * En el monorepo, todos los datos viven en la misma DB PostgreSQL,
 * por lo que las consultas son directas. En una arquitectura de
 * microservicios con DBs separadas esto sería un agregador HTTP.
 */
@Injectable()
export class FinancialSummaryService {
  constructor(private readonly db: DatabaseService) {}

  async getSummary(warehouseId: string, month: string) {
    const from = dayjs(month, 'YYYY-MM').startOf('month').toDate();
    const to   = dayjs(month, 'YYYY-MM').endOf('month').toDate();

    // Ejecutar todas las consultas en paralelo (no hay dependencias entre ellas)
    const [
      salesRevenue,
      salesCount,
      cashIncome,
      cashExpense,
      topExpenseCategories,
      accumulatedSetting,
      lastTransfer,
      teamPaymentsTotal,
    ] = await Promise.all([
      // Ingresos por ventas POS
      this.db.sale.aggregate({
        where: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true },
      }),

      this.db.sale.count({
        where: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } },
      }),

      // Ingresos de caja (manuales)
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, type: 'INCOME', accountingMonth: month },
        _sum: { amount: true },
      }),

      // Gastos de caja
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, type: 'EXPENSE', accountingMonth: month },
        _sum: { amount: true },
      }),

      // Top 5 categorías de gasto
      this.db.cashMovement.groupBy({
        by: ['category'],
        where: { warehouseId, isDeleted: false, type: 'EXPENSE', accountingMonth: month },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),

      // Saldo acumulado inicial
      this.db.accumulatedAccountSetting.findUnique({
        where: { warehouseId },
        select: { cashBalance: true, digitalBalance: true },
      }),

      // Último cierre de mes
      this.db.accumulatedAccountTransfer.findFirst({
        where: { warehouseId },
        orderBy: { transferMonth: 'desc' },
        select: { closingCashAmount: true, closingDigitalAmount: true, transferMonth: true },
      }),

      // Planilla del mes
      this.db.teamPayment.aggregate({
        where: {
          team: { warehouseId },
          accountingMonth: month,
        },
        _sum: { amount: true },
      }),
    ]);

    const totalSalesRevenue = Number(salesRevenue._sum.totalAmount ?? 0);
    const totalCashIncome   = Number(cashIncome._sum.amount ?? 0);
    const totalExpense       = Number(cashExpense._sum.amount ?? 0);
    const payroll            = Number(teamPaymentsTotal._sum.amount ?? 0);

    const currentCash    = lastTransfer ? Number(lastTransfer.closingCashAmount)    : Number(accumulatedSetting?.cashBalance ?? 0);
    const currentDigital = lastTransfer ? Number(lastTransfer.closingDigitalAmount) : Number(accumulatedSetting?.digitalBalance ?? 0);

    return {
      period: month,
      warehouseId,
      sales: {
        count: salesCount,
        totalRevenue: totalSalesRevenue,
      },
      cashflow: {
        income: totalCashIncome,
        expense: totalExpense,
        net: totalCashIncome - totalExpense,
        payroll,
      },
      accumulated: {
        currentCash,
        currentDigital,
        total: currentCash + currentDigital,
        lastTransferMonth: lastTransfer?.transferMonth ?? null,
      },
      topExpenseCategories: topExpenseCategories.map((c) => ({
        category: c.category,
        amount: Number(c._sum.amount ?? 0),
      })),
      // Margen estimado: ingresos ventas - gastos - planilla
      estimatedMargin: totalSalesRevenue - totalExpense - payroll,
    };
  }
}
