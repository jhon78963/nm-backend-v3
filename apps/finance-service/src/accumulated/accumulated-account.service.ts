import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

export interface InitializeAccountDto {
  warehouseId: string;
  cashBalance: number;
  digitalBalance: number;
  trackingStartMonth: string; // 'YYYY-MM'
}

export interface MonthEndTransferDto {
  warehouseId: string;
  month: string;      // 'YYYY-MM'
  cashAmount: number;
  digitalAmount: number;
  notes?: string;
}

/**
 * AccumulatedAccountService — Equivale a AccumulatedAccountService de Laravel.
 *
 * El "fondo acumulado" representa el capital disponible en caja/digital
 * que persiste entre meses. Al cierre de cada mes:
 *   1. Se hace un preview del saldo calculado
 *   2. El administrador confirma el traslado con los montos reales
 *   3. Se registra un AccumulatedAccountTransfer que inicia el siguiente mes
 */
@Injectable()
export class AccumulatedAccountService {
  constructor(private readonly db: DatabaseService) {}

  // ── Configuración inicial ─────────────────────────────────────────────────

  async showSettings(warehouseId: string) {
    const setting = await this.db.accumulatedAccountSetting.findUnique({
      where: { warehouseId },
    });
    if (!setting) throw new NotFoundException('Cuenta acumulada no inicializada para este almacén.');
    return setting;
  }

  async initializeSettings(dto: InitializeAccountDto) {
    const exists = await this.db.accumulatedAccountSetting.findUnique({
      where: { warehouseId: dto.warehouseId },
    });
    if (exists) {
      throw new BadRequestException(
        'La cuenta acumulada ya fue inicializada. Usa el endpoint de actualización.',
      );
    }
    return this.db.accumulatedAccountSetting.create({
      data: {
        warehouseId: dto.warehouseId,
        cashBalance: dto.cashBalance,
        digitalBalance: dto.digitalBalance,
        trackingStartMonth: dto.trackingStartMonth,
      },
    });
  }

  async updateSettings(warehouseId: string, dto: Partial<InitializeAccountDto>) {
    await this.showSettings(warehouseId);
    return this.db.accumulatedAccountSetting.update({
      where: { warehouseId },
      data: {
        ...(dto.cashBalance !== undefined && { cashBalance: dto.cashBalance }),
        ...(dto.digitalBalance !== undefined && { digitalBalance: dto.digitalBalance }),
      },
    });
  }

  // ── Cierre mensual ────────────────────────────────────────────────────────

  /**
   * monthEndPreview — Calcula el saldo proyectado para el cierre de mes.
   * Equivale a AccumulatedAccountController@monthEndTransferPreview de Laravel.
   *
   * Fórmula:
   *   Saldo apertura (del setting o del último transfer)
   *   + ingresos CASH/DIGITAL del mes
   *   - egresos CASH/DIGITAL del mes
   *   = Saldo proyectado de cierre
   */
  async monthEndPreview(warehouseId: string, month: string) {
    await this.showSettings(warehouseId);

    const from = dayjs(month, 'YYYY-MM').startOf('month').toDate();
    const to   = dayjs(month, 'YYYY-MM').endOf('month').toDate();

    // Saldo del mes anterior (último transfer o saldo inicial)
    const lastTransfer = await this.db.accumulatedAccountTransfer.findFirst({
      where: { warehouseId },
      orderBy: { transferMonth: 'desc' },
    });

    const settings = await this.showSettings(warehouseId);
    const openingCash    = lastTransfer ? Number(lastTransfer.closingCashAmount)    : Number(settings.cashBalance);
    const openingDigital = lastTransfer ? Number(lastTransfer.closingDigitalAmount) : Number(settings.digitalBalance);

    const [cashIncome, cashExpense, digitalIncome, digitalExpense] = await Promise.all([
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, accountingMonth: month, type: 'INCOME', paymentMethod: 'CASH', date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, accountingMonth: month, type: 'EXPENSE', paymentMethod: 'CASH', date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, accountingMonth: month, type: 'INCOME', paymentMethod: { in: ['YAPE', 'PLIN', 'CARD', 'TRANSFER'] }, date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      this.db.cashMovement.aggregate({
        where: { warehouseId, isDeleted: false, accountingMonth: month, type: 'EXPENSE', paymentMethod: { in: ['YAPE', 'PLIN', 'CARD', 'TRANSFER'] }, date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
    ]);

    const projectedCash    = openingCash    + Number(cashIncome._sum.amount ?? 0)    - Number(cashExpense._sum.amount ?? 0);
    const projectedDigital = openingDigital + Number(digitalIncome._sum.amount ?? 0) - Number(digitalExpense._sum.amount ?? 0);

    return {
      month,
      opening: { cash: openingCash, digital: openingDigital },
      movements: {
        cashIncome: Number(cashIncome._sum.amount ?? 0),
        cashExpense: Number(cashExpense._sum.amount ?? 0),
        digitalIncome: Number(digitalIncome._sum.amount ?? 0),
        digitalExpense: Number(digitalExpense._sum.amount ?? 0),
      },
      projected: { cash: projectedCash, digital: projectedDigital },
    };
  }

  async listTransfers(warehouseId: string) {
    return this.db.accumulatedAccountTransfer.findMany({
      where: { warehouseId },
      orderBy: { transferMonth: 'desc' },
    });
  }

  async recordTransfer(dto: MonthEndTransferDto, createdById: string) {
    const existing = await this.db.accumulatedAccountTransfer.findFirst({
      where: { warehouseId: dto.warehouseId, transferMonth: dto.month },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un cierre registrado para ${dto.month}.`);
    }

    const preview = await this.monthEndPreview(dto.warehouseId, dto.month);

    return this.db.accumulatedAccountTransfer.create({
      data: {
        warehouseId: dto.warehouseId,
        transferMonth: dto.month,
        cashAmount: dto.cashAmount,
        digitalAmount: dto.digitalAmount,
        closingCashAmount: dto.cashAmount,
        closingDigitalAmount: dto.digitalAmount,
        projectedCashAmount: preview.projected.cash,
        projectedDigitalAmount: preview.projected.digital,
        notes: dto.notes,
        createdById,
      },
    });
  }
}
