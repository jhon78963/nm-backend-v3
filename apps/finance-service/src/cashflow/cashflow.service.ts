import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import dayjs from 'dayjs';

export interface DailyReport {
  date: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  closingBalance: number;
  movements: unknown[];
}

/**
 * CashflowService — Equivale a CashflowService de Laravel.
 *
 * Responsabilidades:
 * - CRUD de CashMovement (ingresos/gastos manuales del día)
 * - Reporte diario (getDaily → apertura, movimientos, cierre)
 * - Reporte mensual admin (todas las tiendas) vs tienda individual
 * - Reporte mensual acumulado (ligado a AccumulatedAccountService)
 *
 * La lógica de vouchers (stream de PDF) se delega a NodeUploaderService.
 */
@Injectable()
export class CashflowService {
  constructor(private readonly db: DatabaseService) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    warehouseId: string,
    filters: { month?: string; type?: string; category?: string },
  ) {
    return this.db.cashMovement.findMany({
      where: {
        warehouseId,
        isDeleted: false,
        ...(filters.month && { accountingMonth: filters.month }),
        ...(filters.type && { type: filters.type as 'INCOME' | 'EXPENSE' }),
        ...(filters.category && { category: { contains: filters.category, mode: 'insensitive' as const } }),
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateCashMovementDto, createdById: string) {
    return this.db.cashMovement.create({
      data: {
        warehouseId: dto.warehouseId,
        type: dto.type,
        amount: dto.amount,
        category: dto.category,
        paymentMethod: dto.paymentMethod,
        description: dto.description,
        date: new Date(dto.date),
        accountingMonth: dto.accountingMonth,
        purchaseId: dto.purchaseId,
        createdById,
      },
    });
  }

  async update(id: string, dto: Partial<CreateCashMovementDto>) {
    await this.findById(id);
    return this.db.cashMovement.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.db.cashMovement.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async findById(id: string) {
    const m = await this.db.cashMovement.findFirst({
      where: { id, isDeleted: false },
      include: { vouchers: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!m) throw new NotFoundException('Movimiento de caja no encontrado.');
    return m;
  }

  // ── Reporte diario ────────────────────────────────────────────────────────

  async getDaily(warehouseId: string, date: string): Promise<DailyReport> {
    const from = dayjs(date).startOf('day').toDate();
    const to   = dayjs(date).endOf('day').toDate();

    const movements = await this.db.cashMovement.findMany({
      where: { warehouseId, isDeleted: false, date: { gte: from, lte: to } },
      orderBy: { date: 'asc' },
    });

    const income  = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + Number(m.amount), 0);
    const expense = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + Number(m.amount), 0);

    // Balance de apertura = ingresos previos − gastos previos
    const prevIncome = await this.db.cashMovement.aggregate({
      where: { warehouseId, isDeleted: false, type: 'INCOME', date: { lt: from } },
      _sum: { amount: true },
    });
    const prevExpense = await this.db.cashMovement.aggregate({
      where: { warehouseId, isDeleted: false, type: 'EXPENSE', date: { lt: from } },
      _sum: { amount: true },
    });

    const openingBalance =
      Number(prevIncome._sum.amount ?? 0) - Number(prevExpense._sum.amount ?? 0);

    return {
      date,
      openingBalance,
      totalIncome: income,
      totalExpense: expense,
      closingBalance: openingBalance + income - expense,
      movements,
    };
  }

  // ── Reporte mensual (equivale a getAdminMonthlyReport) ────────────────────

  async getMonthlyReport(accountingMonth: string, warehouseId?: string) {
    const where = {
      isDeleted: false,
      accountingMonth,
      ...(warehouseId && { warehouseId }),
    };

    const [incomeAgg, expenseAgg, byCategory, byPaymentMethod] = await Promise.all([
      this.db.cashMovement.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.db.cashMovement.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.db.cashMovement.groupBy({
        by: ['category', 'type'],
        where,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
      this.db.cashMovement.groupBy({
        by: ['paymentMethod'],
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
    ]);

    return {
      accountingMonth,
      warehouseId,
      totalIncome: Number(incomeAgg._sum.amount ?? 0),
      totalExpense: Number(expenseAgg._sum.amount ?? 0),
      netBalance: Number(incomeAgg._sum.amount ?? 0) - Number(expenseAgg._sum.amount ?? 0),
      incomeCount: incomeAgg._count.id,
      expenseCount: expenseAgg._count.id,
      byCategory: byCategory.map((r) => ({
        category: r.category,
        type: r.type,
        amount: Number(r._sum.amount ?? 0),
      })),
      byPaymentMethod: Object.fromEntries(
        byPaymentMethod.map((r) => [r.paymentMethod, Number(r._sum.amount ?? 0)]),
      ),
    };
  }
}
