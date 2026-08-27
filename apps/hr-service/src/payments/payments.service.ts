import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PayrollCalculatorService } from './payroll-calculator.service';
import dayjs from 'dayjs';

/**
 * PaymentsService — Equivale a PaymentController de Laravel.
 * Gestiona los pagos al personal: salarios, bonos, adelantos.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly payrollCalculator: PayrollCalculatorService,
  ) {}

  async create(dto: CreatePaymentDto, createdById: string) {
    const team = await this.db.team.findFirst({
      where: { id: dto.teamId, isDeleted: false },
    });
    if (!team) throw new NotFoundException('Miembro del equipo no encontrado.');

    return this.db.teamPayment.create({
      data: {
        teamId: dto.teamId,
        type: dto.type,
        amount: dto.amount,
        date: new Date(dto.date),
        payrollPeriod: dto.payrollPeriod,
        accountingMonth: dto.accountingMonth,
        paymentMethod: dto.paymentMethod,
        cashMovementId: dto.cashMovementId,
      },
    });
  }

  async update(id: string, dto: Partial<CreatePaymentDto>) {
    const payment = await this.db.teamPayment.findFirst({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');

    const updated = await this.db.teamPayment.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.payrollPeriod !== undefined ? { payrollPeriod: dto.payrollPeriod } : {}),
        ...(dto.accountingMonth !== undefined ? { accountingMonth: dto.accountingMonth } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
      },
    });

    return {
      success: true,
      message: 'Movimiento actualizado correctamente.',
      data: {
        id: updated.id,
        type: updated.type,
        amount: Number(updated.amount),
        date: updated.date,
        payrollPeriod: updated.payrollPeriod,
        accountingMonth: updated.accountingMonth,
        paymentMethod: updated.paymentMethod,
        cashMovementId: updated.cashMovementId,
      },
    };
  }

  async remove(id: string) {
    const payment = await this.db.teamPayment.findFirst({ where: { id } });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    await this.db.teamPayment.delete({ where: { id } });
  }

  /**
   * getByMonth — Lista todos los pagos del mes por almacén.
   */
  async getByMonth(warehouseId: string, month: string) {
    return this.db.teamPayment.findMany({
      where: {
        accountingMonth: month,
        team: { warehouseId, isDeleted: false },
      },
      orderBy: { date: 'desc' },
      include: {
        team: { select: { id: true, name: true, surname: true } },
      },
    });
  }

  /**
   * getPayrollForTeam — Equivale a PaymentController@getPayroll (Laravel).
   * Vista de nómina por colaborador con asistencia, movimientos y estimados.
   */
  async getPayrollForTeam(
    warehouseId: string,
    teamId: string,
    month: number,
    year: number,
    period: 'full' | 'q1' | 'q2' = 'full',
  ) {
    const team = await this.db.team.findFirst({
      where: { id: teamId, warehouseId, isDeleted: false },
    });
    if (!team) {
      throw new NotFoundException('Colaborador no encontrado.');
    }

    const from = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const to = dayjs(`${year}-${month}-01`).endOf('month').toDate();
    const accountingMonth = `${year}-${String(month).padStart(2, '0')}`;

    const [attendances, payments] = await Promise.all([
      this.db.attendance.findMany({
        where: {
          teamId,
          date: { gte: from, lte: to },
        },
        orderBy: { date: 'asc' },
      }),
      this.db.teamPayment.findMany({
        where: {
          teamId,
          OR: [
            { accountingMonth },
            {
              accountingMonth: null,
              date: { gte: from, lte: to },
            },
          ],
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    return this.payrollCalculator.buildPayroll({
      team,
      month,
      year,
      period,
      attendances,
      payments,
    });
  }
}
