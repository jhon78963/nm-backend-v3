import dayjs from 'dayjs';

export const DIGITAL_PAYMENT_METHODS = ['YAPE', 'PLIN', 'CARD', 'TRANSFER'] as const;

export interface SalePaymentRow {
  method: string;
  amount: number;
}

export interface SaleForReport {
  id: string;
  code?: string | null;
  createdAt: Date;
  totalAmount: unknown;
  paymentMethod: string;
  customer?: { name: string } | null;
  details?: Array<{ quantity?: number }>;
  payments?: Array<{ method: string; amount: unknown }>;
}

export interface StoreIncomeMovement {
  id: string;
  date: Date;
  amount: unknown;
  paymentMethod: string;
  description: string | null;
}

export interface PaymentBreakdownRow {
  method: string;
  label: string;
  amount: number;
  count: number;
}

export interface DailyCajaEntry {
  id: string;
  source: 'sale' | 'income';
  code: string;
  time: string;
  customer: string;
  description: string | null;
  itemsCount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentLabel: string;
}

export interface DailyBreakdownRow {
  date: string;
  dayOfWeek: string;
  transactions: number;
  total: number;
  cash: number;
  digital: number;
}

export function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    YAPE: 'Yape',
    PLIN: 'Plin',
    TRANSFER: 'Transferencia',
    MIXED: 'Mixto',
    MIXTO: 'Mixto',
  };

  return map[method] ?? method;
}

export function resolveSalePayments(sale: {
  payments?: Array<{ method: string; amount: unknown }>;
  paymentMethod: string;
  totalAmount: unknown;
}): SalePaymentRow[] {
  const payments = sale.payments ?? [];

  if (payments.length > 0) {
    return payments.map((payment) => ({
      method: payment.method,
      amount: Number(payment.amount),
    }));
  }

  return [{
    method: sale.paymentMethod,
    amount: Number(sale.totalAmount),
  }];
}

export function buildCajaIngresosBreakdown(
  sales: SaleForReport[],
  storeIncomes: StoreIncomeMovement[],
): PaymentBreakdownRow[] {
  const totals = new Map<string, { amount: number; count: number }>();

  for (const sale of sales) {
    for (const payment of resolveSalePayments(sale)) {
      const current = totals.get(payment.method) ?? { amount: 0, count: 0 };
      current.amount += payment.amount;
      current.count += 1;
      totals.set(payment.method, current);
    }
  }

  for (const movement of storeIncomes) {
    const method = movement.paymentMethod;
    const current = totals.get(method) ?? { amount: 0, count: 0 };
    current.amount += Number(movement.amount);
    current.count += 1;
    totals.set(method, current);
  }

  return [...totals.entries()]
    .map(([method, data]) => ({
      method,
      label: paymentLabel(method),
      amount: round2(data.amount),
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function sumPaymentBreakdownByMethods(
  breakdown: PaymentBreakdownRow[],
  methods: readonly string[],
): number {
  return round2(
    breakdown
      .filter((row) => methods.includes(row.method))
      .reduce((sum, row) => sum + row.amount, 0),
  );
}

export function buildDailyCajaEntries(
  sales: SaleForReport[],
  storeIncomes: StoreIncomeMovement[],
): DailyCajaEntry[] {
  const entries: Array<DailyCajaEntry & { sortAt: number }> = [];

  for (const sale of sales) {
    entries.push({
      sortAt: dayjs(sale.createdAt).valueOf(),
      id: sale.id,
      source: 'sale',
      code: sale.code ?? sale.id.slice(0, 8),
      time: dayjs(sale.createdAt).format('HH:mm'),
      customer: sale.customer?.name ?? 'Público General',
      description: null,
      itemsCount: (sale.details ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
      totalAmount: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
      paymentLabel: paymentLabel(sale.paymentMethod),
    });
  }

  for (const movement of storeIncomes) {
    entries.push({
      sortAt: dayjs(movement.date).valueOf(),
      id: movement.id,
      source: 'income',
      code: 'ING',
      time: dayjs(movement.date).format('HH:mm'),
      customer: '—',
      description: movement.description,
      itemsCount: 0,
      totalAmount: Number(movement.amount),
      paymentMethod: movement.paymentMethod,
      paymentLabel: paymentLabel(movement.paymentMethod),
    });
  }

  return entries
    .sort((a, b) => b.sortAt - a.sortAt)
    .map(({ sortAt: _sortAt, ...entry }) => entry);
}

export function buildDailyBreakdown(
  sales: SaleForReport[],
  storeIncomes: StoreIncomeMovement[],
  startDate: string,
  endDate: string,
): DailyBreakdownRow[] {
  const byDay = new Map<string, {
    date: string;
    dayOfWeek: string;
    transactions: number;
    total: number;
    cash: number;
    digital: number;
  }>();

  const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  for (let offset = 0; offset < diffDays; offset++) {
    const key = dayjs(startDate).add(offset, 'day').format('YYYY-MM-DD');
    byDay.set(key, {
      date: dayjs(key).format('DD/MM/YYYY'),
      dayOfWeek: dayjs(key).format('dddd'),
      transactions: 0,
      total: 0,
      cash: 0,
      digital: 0,
    });
  }

  for (const sale of sales) {
    const key = dayjs(sale.createdAt).format('YYYY-MM-DD');
    const row = byDay.get(key);
    if (!row) continue;

    row.transactions += 1;
    row.total += Number(sale.totalAmount);
    applyPaymentAmountsToDayRow(row, resolveSalePayments(sale));
  }

  for (const movement of storeIncomes) {
    const key = dayjs(movement.date).format('YYYY-MM-DD');
    const row = byDay.get(key);
    if (!row) continue;

    const amount = Number(movement.amount);
    row.transactions += 1;
    row.total += amount;
    applyPaymentAmountsToDayRow(row, [{
      method: movement.paymentMethod,
      amount,
    }]);
  }

  return [...byDay.values()].map((row) => ({
    ...row,
    total: round2(row.total),
    cash: round2(row.cash),
    digital: round2(row.digital),
  }));
}

export function buildHourlyCajaChart(
  sales: SaleForReport[],
  storeIncomes: StoreIncomeMovement[],
) {
  const hourly: Record<string, { count: number; amount: number }> = {};
  for (let hour = 7; hour <= 22; hour++) {
    hourly[`${String(hour).padStart(2, '0')}:00`] = { count: 0, amount: 0 };
  }

  for (const sale of sales) {
    const key = `${dayjs(sale.createdAt).format('HH')}:00`;
    if (!hourly[key]) continue;
    hourly[key].count += 1;
    hourly[key].amount += Number(sale.totalAmount);
  }

  for (const movement of storeIncomes) {
    const key = `${dayjs(movement.date).format('HH')}:00`;
    if (!hourly[key]) continue;
    hourly[key].count += 1;
    hourly[key].amount += Number(movement.amount);
  }

  return {
    labels: Object.keys(hourly),
    amounts: Object.values(hourly).map((value) => round2(value.amount)),
    counts: Object.values(hourly).map((value) => value.count),
  };
}

function applyPaymentAmountsToDayRow(
  row: { cash: number; digital: number },
  payments: SalePaymentRow[],
): void {
  for (const payment of payments) {
    if (payment.method === 'CASH') {
      row.cash += payment.amount;
      continue;
    }

    if (DIGITAL_PAYMENT_METHODS.includes(payment.method as typeof DIGITAL_PAYMENT_METHODS[number])) {
      row.digital += payment.amount;
    }
  }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
