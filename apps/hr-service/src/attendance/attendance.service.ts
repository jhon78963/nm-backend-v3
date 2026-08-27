import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import dayjs from 'dayjs';

/**
 * AttendanceService — Equivale a AttendanceController de Laravel.
 * Gestiona el registro diario de asistencia del personal.
 *
 * Restricción: solo un registro por team_member × fecha (unique constraint).
 */
@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

  async record(dto: RecordAttendanceDto) {
    const existing = await this.db.attendance.findUnique({
      where: { teamId_date: { teamId: dto.teamId, date: new Date(dto.date) } },
    });
    if (existing) {
      // Actualizar si ya existe (equivale al updateOrCreate de Laravel)
      return this.db.attendance.update({
        where: { teamId_date: { teamId: dto.teamId, date: new Date(dto.date) } },
        data: {
          status: dto.status,
          checkIn: dto.checkIn ? this.parseTime(dto.date, dto.checkIn) : null,
          checkOut: dto.checkOut ? this.parseTime(dto.date, dto.checkOut) : null,
          delayMinutes: dto.delayMinutes ?? 0,
          notes: dto.notes,
        },
      });
    }
    return this.db.attendance.create({
      data: {
        teamId: dto.teamId,
        date: new Date(dto.date),
        status: dto.status,
        checkIn: dto.checkIn ? this.parseTime(dto.date, dto.checkIn) : null,
        checkOut: dto.checkOut ? this.parseTime(dto.date, dto.checkOut) : null,
        delayMinutes: dto.delayMinutes ?? 0,
        notes: dto.notes,
      },
    });
  }

  /**
   * getDailySummary — Equivale a AttendanceController@getDailySummary.
   * Retorna el estado de todos los miembros del equipo para un día.
   */
  async getDailySummary(warehouseId: string, date: string) {
    const teams = await this.db.team.findMany({
      where: { warehouseId, isDeleted: false },
      include: {
        attendances: {
          where: { date: new Date(date) },
          take: 1,
        },
      },
      orderBy: [{ surname: 'asc' }],
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      surname: t.surname,
      attendance: t.attendances[0] ?? null,
      status: t.attendances[0]?.status ?? 'NOT_RECORDED',
    }));
  }

  /**
   * getByMonthForTeam — Equivale a AttendanceController@getByMonth (Laravel).
   * Registros del mes para un colaborador, indexados por fecha YYYY-MM-DD.
   */
  async getByMonthForTeam(warehouseId: string, teamId: string, month: string) {
    const team = await this.db.team.findFirst({
      where: { id: teamId, warehouseId, isDeleted: false },
    });
    if (!team) {
      throw new NotFoundException('Colaborador no encontrado.');
    }

    const from = dayjs(month, 'YYYY-MM').startOf('month').toDate();
    const to   = dayjs(month, 'YYYY-MM').endOf('month').toDate();

    const attendances = await this.db.attendance.findMany({
      where: {
        teamId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    const data: Record<string, {
      status: string;
      checkInTime: string | null;
      checkOutTime: string | null;
      delayMinutes: number;
      notes: string | null;
    }> = {};

    for (const a of attendances) {
      const dateKey = dayjs(a.date).format('YYYY-MM-DD');
      data[dateKey] = {
        status: a.status,
        checkInTime: this.formatTime(a.checkIn),
        checkOutTime: this.formatTime(a.checkOut),
        delayMinutes: a.delayMinutes,
        notes: a.notes,
      };
    }

    return { data };
  }

  /**
   * getByMonth — Resumen de asistencia del mes para todos los miembros de un warehouse.
   */
  async getByMonth(warehouseId: string, month: string) {
    const from = dayjs(month, 'YYYY-MM').startOf('month').toDate();
    const to   = dayjs(month, 'YYYY-MM').endOf('month').toDate();

    const teams = await this.db.team.findMany({
      where: { warehouseId, isDeleted: false },
      include: {
        attendances: {
          where: { date: { gte: from, lte: to } },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: [{ surname: 'asc' }],
    });

    return teams.map((t) => {
      const present = t.attendances.filter((a) =>
        ['PUNTUAL', 'TOLERANCIA', 'TARDE', 'RECUPERACION'].includes(a.status),
      ).length;
      const absent = t.attendances.filter((a) =>
        ['FALTA', 'FALTA_INJUSTIFICADA'].includes(a.status),
      ).length;
      const totalDelay = t.attendances.reduce((s, a) => s + a.delayMinutes, 0);

      return {
        teamId: t.id,
        name: `${t.name} ${t.surname}`,
        month,
        presentDays: present,
        absentDays: absent,
        totalDelayMinutes: totalDelay,
        attendances: t.attendances,
      };
    });
  }

  private parseTime(date: string, time: string): Date {
    return dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toDate();
  }

  private formatTime(value: Date | null): string | null {
    if (!value) return null;
    return dayjs(value).format('HH:mm');
  }
}
