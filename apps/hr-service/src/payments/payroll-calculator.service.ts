import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

type PayrollViewPeriod = 'full' | 'q1' | 'q2';
type SaldoSentido = 'favor' | 'debe' | 'cero';

interface AttendanceRow {
  date: Date;
  status: string;
  checkIn: Date | null;
  checkOut: Date | null;
}

interface PaymentRow {
  id: string;
  type: string;
  amount: unknown;
  date: Date;
  payrollPeriod: string | null;
  accountingMonth: string | null;
  paymentMethod: string;
  cashMovementId: string | null;
}

interface TimeBlock {
  days: number;
  hours: number;
  minutes: number;
}

interface AttendanceBreakdown {
  falta: number;
  faltaInjustificada: number;
  valdeo: number;
  recuperacion: number;
  faltasEquivalentes: number;
  faltasADescontar: number;
  descuentoPorAusencias: number;
  descuentoPorTiempoNoCumplido: number;
  descuentoPorFaltas: number;
  diasConRetraso: number;
  deudaEntradaTardeMinutos: number;
  deudaSalidaAnticipadaMinutos: number;
  deudaTiempoTotalMinutos: number;
  favorLlegadaTempranaTotalMinutos: number;
  favorSalidaTardeTotalMinutos: number;
  favorTiempoTotalMinutos: number;
  saldoTiempoNetoMinutos: number;
  saldoTiempoNetoSentido: SaldoSentido;
  saldoTiempoNetoMagnitud: TimeBlock;
  deudaEntradaTarde: TimeBlock;
  deudaSalidaAnticipada: TimeBlock;
  deudaTiempo: TimeBlock;
  favorLlegadaTemprana: TimeBlock;
  favorSalidaTarde: TimeBlock;
  deudaPorDia: Array<{
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    deudaEntradaTardeMinutos: number;
    deudaSalidaAnticipadaMinutos: number;
    favorLlegadaTempranaMinutos: number;
    favorSalidaTardeMinutos: number;
    saldoNetoMinutos: number;
    saldoNetoSentido: SaldoSentido;
  }>;
}

@Injectable()
export class PayrollCalculatorService {
  private static readonly OFFICIAL_END_HOUR = 19;
  private static readonly OFFICIAL_END_MINUTE = 30;
  private static readonly ENTRY_TOLERANCE_MINUTES = 10;
  private static readonly MINUTES_NOMINAL_SHIFT = 11 * 60 + 30;
  private static readonly PAYROLL_DAYS_IN_MONTH = 30;

  buildPayroll(params: {
    team: { id: string; name: string; surname: string; dni: string; salary: unknown };
    month: number;
    year: number;
    period: PayrollViewPeriod;
    attendances: AttendanceRow[];
    payments: PaymentRow[];
  }) {
    const { team, month, year, period, attendances, payments } = params;
    const calendarDaysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();
    const payrollDaysInMonth = PayrollCalculatorService.PAYROLL_DAYS_IN_MONTH;
    const salary = this.round(Number(team.salary), 2);
    const dailyRate = this.round(salary / payrollDaysInMonth, 4);

    const scopeVista = this.attendanceBreakdown(attendances, year, month, period, dailyRate);
    const scopeMes = this.attendanceBreakdown(attendances, year, month, 'full', dailyRate);

    const movMes = this.paymentSumsForPeriod(payments, null);
    const movQ1 = this.paymentSumsForPeriod(payments, 'q1');
    const movQ2 = this.paymentSumsForPeriod(payments, 'q2');
    const movPeriodo = period === 'q1' ? movQ1 : period === 'q2' ? movQ2 : movMes;

    const descuentoAsistenciaMes = scopeMes.descuentoPorFaltas;
    const trasFaltas = this.round(salary - descuentoAsistenciaMes, 2);
    const estimadoFinMes = this.round(
      salary - descuentoAsistenciaMes - movMes.DEDUCTION - movMes.ADVANCE - movMes.PAYMENT,
      2,
    );

    const daysInPeriod = period === 'q1' || period === 'q2'
      ? Math.floor(payrollDaysInMonth / 2)
      : payrollDaysInMonth;
    const proporcionPeriodo = period === 'q1' || period === 'q2'
      ? this.round(salary / 2, 2)
      : this.round(salary, 2);
    const descuentoVista = scopeVista.descuentoPorFaltas;
    const netoTrasFaltasPeriodo = this.round(proporcionPeriodo - descuentoVista, 2);
    const totalSalidaPeriodo = this.round(
      movPeriodo.ADVANCE + movPeriodo.PAYMENT + movPeriodo.DEDUCTION,
      2,
    );
    const restanteAlCierre = this.round(netoTrasFaltasPeriodo - totalSalidaPeriodo, 2);
    const cierreDia = period === 'q1' ? Math.min(15, calendarDaysInMonth) : calendarDaysInMonth;

    return {
      success: true,
      data: {
        team: {
          id: team.id,
          name: team.name,
          surname: team.surname,
          dni: team.dni,
          salary,
        },
        calendar: {
          month,
          year,
          daysInMonth: payrollDaysInMonth,
          period,
          periodLabel: this.periodLabel(period, calendarDaysInMonth),
        },
        rates: {
          dailyRate,
          halfMonthReference: this.round(salary / 2, 2),
        },
        attendanceVista: scopeVista,
        attendanceMesCompleto: scopeMes,
        movementsMonth: {
          advances: movMes.ADVANCE,
          payments: movMes.PAYMENT,
          deductions: movMes.DEDUCTION,
        },
        movementsQuincena1: {
          advances: movQ1.ADVANCE,
          payments: movQ1.PAYMENT,
          deductions: movQ1.DEDUCTION,
        },
        movementsQuincena2: {
          advances: movQ2.ADVANCE,
          payments: movQ2.PAYMENT,
          deductions: movQ2.DEDUCTION,
        },
        movementsVistaPeriodo: {
          advances: movPeriodo.ADVANCE,
          payments: movPeriodo.PAYMENT,
          deductions: movPeriodo.DEDUCTION,
        },
        paymentItems: this.formatPaymentItems(payments, period),
        estimates: {
          salarioBase: salary,
          descuentoAsistenciaMesCompleto: descuentoAsistenciaMes,
          salarioTrasDescuentoFaltas: trasFaltas,
          estimadoAPagarFinMes: estimadoFinMes,
          nota: 'Incluye descuentos por ausencias (Falta/Valdeo netas), proporcional al tiempo no cumplido (retraso desde las 8:00 si el estado es TARDE, o tras tolerancia en otros casos, y salida antes de 19:30), más adelantos, pagos quincenales y descuentos manuales del mes.',
        },
        liquidacionPeriodo: {
          period,
          diasEnPeriodo: daysInPeriod,
          proporcionSalarioPeriodo: proporcionPeriodo,
          descuentoAsistenciaEnAmbito: descuentoVista,
          descuentoPorAusenciasEnAmbito: this.round(scopeVista.descuentoPorAusencias, 2),
          descuentoPorTiempoNoCumplidoEnAmbito: this.round(scopeVista.descuentoPorTiempoNoCumplido, 2),
          netoTrasFaltasPeriodo,
          adelantosPeriodo: movPeriodo.ADVANCE,
          pagosRegistradosPeriodo: movPeriodo.PAYMENT,
          descuentosManualesPeriodo: movPeriodo.DEDUCTION,
          totalMovimientosSalida: totalSalidaPeriodo,
          restanteEstimadoAlCierre: restanteAlCierre,
          fechaCierreLegible: this.spanishLongDate(year, month, cierreDia),
        },
      },
    };
  }

  private attendanceBreakdown(
    attendances: AttendanceRow[],
    year: number,
    month: number,
    period: PayrollViewPeriod,
    dailyRate: number,
  ): AttendanceBreakdown {
    const lastDay = dayjs(`${year}-${month}-01`).daysInMonth();
    const inPeriod = (day: number): boolean => {
      if (period === 'q1') return day >= 1 && day <= 15;
      if (period === 'q2') return day >= 16 && day <= lastDay;
      return true;
    };

    let falta = 0;
    let faltaInjustificada = 0;
    let valdeo = 0;
    let recuperacion = 0;
    let sumEntradaTarde = 0;
    let sumSalidaAnticipada = 0;
    let sumFavorLlegada = 0;
    let sumFavorSalida = 0;
    let diasConRetraso = 0;
    const deudaPorDia: AttendanceBreakdown['deudaPorDia'] = [];

    for (const row of attendances) {
      const carbon = dayjs(row.date);
      if (carbon.month() + 1 !== month || carbon.year() !== year) continue;
      const day = carbon.date();
      if (!inPeriod(day)) continue;

      const status = String(row.status);
      if (status === 'FALTA') falta++;
      else if (status === 'FALTA_INJUSTIFICADA') faltaInjustificada++;
      else if (status === 'VALDEO') valdeo++;
      else if (status === 'RECUPERACION') recuperacion++;

      const dateOnly = carbon.startOf('day');
      const bal = this.computeRowTimeBalance(row, dateOnly, status);
      if (bal.deudaEntrada > 0) diasConRetraso++;
      sumEntradaTarde += bal.deudaEntrada;
      sumSalidaAnticipada += bal.deudaSalida;
      sumFavorLlegada += bal.favorLlegada;
      sumFavorSalida += bal.favorSalida;

      const inFmt = this.formatTimeHm(row.checkIn);
      const outFmt = this.formatTimeHm(row.checkOut);
      if (this.statusUsesShiftExit(status) && inFmt && outFmt) {
        deudaPorDia.push({
          date: dateOnly.format('YYYY-MM-DD'),
          status,
          checkIn: inFmt,
          checkOut: outFmt,
          deudaEntradaTardeMinutos: bal.deudaEntrada,
          deudaSalidaAnticipadaMinutos: bal.deudaSalida,
          favorLlegadaTempranaMinutos: bal.favorLlegada,
          favorSalidaTardeMinutos: bal.favorSalida,
          saldoNetoMinutos: bal.saldoNeto,
          saldoNetoSentido: this.saldoSentido(bal.saldoNeto),
        });
      }
    }

    deudaPorDia.sort((a, b) => a.date.localeCompare(b.date));

    const totalDeudaMin = sumEntradaTarde + sumSalidaAnticipada;
    const faltasEquivalentes = falta + faltaInjustificada * 2 + valdeo;
    const faltasADescontar = Math.max(0, faltasEquivalentes - recuperacion);
    const descuentoPorAusencias = this.round(faltasADescontar * dailyRate, 2);
    const descuentoPorTiempoNoCumplido = PayrollCalculatorService.MINUTES_NOMINAL_SHIFT > 0
      ? this.round((totalDeudaMin / PayrollCalculatorService.MINUTES_NOMINAL_SHIFT) * dailyRate, 2)
      : 0;
    const descuentoPorFaltas = this.round(descuentoPorAusencias + descuentoPorTiempoNoCumplido, 2);
    const totalFavorMin = sumFavorLlegada + sumFavorSalida;
    const saldoNeto = sumFavorLlegada + sumFavorSalida - sumEntradaTarde - sumSalidaAnticipada;

    return {
      falta,
      faltaInjustificada,
      valdeo,
      recuperacion,
      faltasEquivalentes,
      faltasADescontar,
      descuentoPorAusencias,
      descuentoPorTiempoNoCumplido,
      descuentoPorFaltas,
      diasConRetraso,
      deudaEntradaTardeMinutos: sumEntradaTarde,
      deudaSalidaAnticipadaMinutos: sumSalidaAnticipada,
      deudaTiempoTotalMinutos: totalDeudaMin,
      favorLlegadaTempranaTotalMinutos: sumFavorLlegada,
      favorSalidaTardeTotalMinutos: sumFavorSalida,
      favorTiempoTotalMinutos: totalFavorMin,
      saldoTiempoNetoMinutos: saldoNeto,
      saldoTiempoNetoSentido: this.saldoSentido(saldoNeto),
      saldoTiempoNetoMagnitud: this.splitMinutes(Math.abs(saldoNeto)),
      deudaEntradaTarde: this.splitMinutes(sumEntradaTarde),
      deudaSalidaAnticipada: this.splitMinutes(sumSalidaAnticipada),
      deudaTiempo: this.splitMinutes(totalDeudaMin),
      favorLlegadaTemprana: this.splitMinutes(sumFavorLlegada),
      favorSalidaTarde: this.splitMinutes(sumFavorSalida),
      deudaPorDia,
    };
  }

  private computeRowTimeBalance(row: AttendanceRow, dateOnly: dayjs.Dayjs, status: string) {
    let deudaEntrada = 0;
    let deudaSalida = 0;
    let favorLlegada = 0;
    let favorSalida = 0;

    const entry = this.combineDateAndTime(dateOnly, row.checkIn);
    const exit = this.combineDateAndTime(dateOnly, row.checkOut);
    const limit8 = dateOnly.hour(8).minute(0).second(0).millisecond(0);

    if (this.statusUsesEntryRules(status) && entry) {
      if (status === 'TARDE') {
        if (entry.isAfter(limit8)) {
          deudaEntrada = this.minutesLateAfter(limit8, entry);
        }
      } else {
        const toleranceEnd = limit8.add(PayrollCalculatorService.ENTRY_TOLERANCE_MINUTES, 'minute');
        if (entry.isAfter(toleranceEnd)) {
          deudaEntrada = this.minutesLateAfter(toleranceEnd, entry);
        }
      }
    }

    if (this.statusCreditsEarlyArrival(status) && entry && entry.isBefore(limit8)) {
      favorLlegada = this.minutesLateAfter(entry, limit8);
    }

    if (this.statusUsesShiftExit(status) && entry && exit) {
      const officialEnd = dateOnly
        .hour(PayrollCalculatorService.OFFICIAL_END_HOUR)
        .minute(PayrollCalculatorService.OFFICIAL_END_MINUTE)
        .second(0)
        .millisecond(0);
      if (exit.isBefore(officialEnd)) {
        deudaSalida = this.minutesLateAfter(exit, officialEnd);
      } else if (exit.isAfter(officialEnd)) {
        favorSalida = this.minutesLateAfter(officialEnd, exit);
      }
    }

    return {
      deudaEntrada,
      deudaSalida,
      favorLlegada,
      favorSalida,
      saldoNeto: favorLlegada + favorSalida - deudaEntrada - deudaSalida,
    };
  }

  private paymentSumsForPeriod(payments: PaymentRow[], period: PayrollViewPeriod | null) {
    const filtered = payments.filter((p) => this.paymentBelongsToViewPeriod(p, period ?? 'full'));
    return {
      ADVANCE: this.round(this.sumByType(filtered, 'ADVANCE'), 2),
      PAYMENT: this.round(this.sumByType(filtered, 'PAYMENT'), 2),
      DEDUCTION: this.round(this.sumByType(filtered, 'DEDUCTION'), 2),
    };
  }

  private sumByType(payments: PaymentRow[], type: string): number {
    return payments
      .filter((p) => p.type === type)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  private formatPaymentItems(payments: PaymentRow[], period: PayrollViewPeriod) {
    return payments
      .filter((p) => this.paymentBelongsToViewPeriod(p, period))
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .map((p) => this.formatPaymentItem(p));
  }

  private formatPaymentItem(payment: PaymentRow) {
    const payrollPeriod = this.resolvePayrollPeriod(payment);
    return {
      id: payment.id,
      type: payment.type,
      typeLabel: this.paymentTypeLabel(payment.type),
      amount: Number(payment.amount),
      date: dayjs(payment.date).format('YYYY-MM-DD HH:mm:ss'),
      payrollPeriod,
      payrollPeriodLabel: this.payrollPeriodLabel(payrollPeriod),
      accountingMonth: payment.accountingMonth,
      accountingPeriodLabel: this.accountingPeriodLabel(payment.accountingMonth, payrollPeriod),
      description: null,
      syncedToAdmin: payment.cashMovementId !== null,
      cashMovementId: payment.cashMovementId,
      paymentMethod: payment.paymentMethod ?? 'CASH',
      voucherPath: null,
      voucherPaths: [],
      adminExpenseDescription: null,
    };
  }

  private paymentBelongsToViewPeriod(payment: PaymentRow, period: PayrollViewPeriod): boolean {
    if (period === 'full') return true;
    return this.resolvePayrollPeriod(payment) === period;
  }

  private resolvePayrollPeriod(payment: PaymentRow): 'q1' | 'q2' {
    if (payment.payrollPeriod === 'q1' || payment.payrollPeriod === 'q2') {
      return payment.payrollPeriod;
    }
    return dayjs(payment.date).date() <= 15 ? 'q1' : 'q2';
  }

  private paymentTypeLabel(type: string): string {
    switch (type) {
      case 'ADVANCE': return 'Adelanto';
      case 'PAYMENT': return 'Pago quincenal';
      case 'DEDUCTION': return 'Descuento manual';
      default: return type;
    }
  }

  private payrollPeriodLabel(period: string): string {
    switch (period) {
      case 'q1': return 'Cierre 1–15';
      case 'q2': return 'Cierre 16–fin de mes';
      default: return period;
    }
  }

  private accountingPeriodLabel(accountingMonth: string | null, payrollPeriod: string): string | null {
    if (!accountingMonth) return null;
    const parsed = dayjs(`${accountingMonth}-01`);
    const monthName = parsed.isValid()
      ? parsed.format('MMMM YYYY')
      : accountingMonth;
    return `${monthName} · ${this.payrollPeriodLabel(payrollPeriod)}`;
  }

  private periodLabel(period: PayrollViewPeriod, lastDay: number): string {
    switch (period) {
      case 'q1': return '1.ª quincena (días 1–15)';
      case 'q2': return `2.ª quincena (días 16–${lastDay})`;
      default: return 'Mes completo';
    }
  }

  private spanishLongDate(year: number, month: number, day: number): string {
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `${day} de ${meses[month - 1] ?? month} de ${year}`;
  }

  private statusCreditsEarlyArrival(status: string): boolean {
    return ['PUNTUAL', 'TARDE', 'TOLERANCIA', 'RECUPERACION'].includes(status);
  }

  private statusUsesEntryRules(status: string): boolean {
    return ['PUNTUAL', 'TARDE', 'TOLERANCIA'].includes(status);
  }

  private statusUsesShiftExit(status: string): boolean {
    return ['PUNTUAL', 'TARDE', 'TOLERANCIA', 'RECUPERACION'].includes(status);
  }

  private combineDateAndTime(dateOnly: dayjs.Dayjs, raw: Date | null): dayjs.Dayjs | null {
    if (!raw) return null;
    const t = dayjs(raw);
    return dateOnly.hour(t.hour()).minute(t.minute()).second(t.second()).millisecond(0);
  }

  private formatTimeHm(raw: Date | null): string | null {
    if (!raw) return null;
    return dayjs(raw).format('HH:mm');
  }

  private minutesLateAfter(anchor: dayjs.Dayjs, actual: dayjs.Dayjs): number {
    if (!actual.isAfter(anchor)) return 0;
    return Math.floor(actual.diff(anchor, 'minute', true));
  }

  private saldoSentido(saldoNeto: number): SaldoSentido {
    if (saldoNeto > 0) return 'favor';
    if (saldoNeto < 0) return 'debe';
    return 'cero';
  }

  private splitMinutes(total: number): TimeBlock {
    const safe = Math.max(0, total);
    const days = Math.floor(safe / 1440);
    const rem = safe % 1440;
    const hours = Math.floor(rem / 60);
    const minutes = rem % 60;
    return { days, hours, minutes };
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
