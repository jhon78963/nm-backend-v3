/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  // ── Sales Daily Report ──────────────────────────────────────────────────────
  async getDailySalesReport(date: string, warehouseId: string) {
    const start = dayjs(date).startOf('day').toDate();
    const end   = dayjs(date).endOf('day').toDate();

    const [sales, paymentAggs] = await Promise.all([
      this.db.sale.findMany({
        where: { warehouseId, isDeleted: false, createdAt: { gte: start, lte: end } },
        include: {
          customer: { select: { name: true } },
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }) as Promise<any[]>,
      this.db.salePayment.groupBy({
        by: ['method'],
        where: {
          sale: { warehouseId, isDeleted: false, createdAt: { gte: start, lte: end } },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalAmount = sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const totalSales  = sales.length;
    const itemsSold   = sales.reduce(
      (sum: number, s: any) => sum + (s.details ?? []).reduce((si: number, i: any) => si + i.quantity, 0),
      0,
    );

    const paymentBreakdown = paymentAggs.map((p) => ({
      method: p.method,
      label: this.paymentLabel(p.method),
      amount: Number(p._sum.amount ?? 0),
      count: p._count.id,
    }));

    const cashPayment = paymentBreakdown.find((p) => p.method === 'CASH');
    const cash = cashPayment ? cashPayment.amount : 0;
    const digital = totalAmount - cash;

    // Hourly chart
    const hourly: Record<string, { count: number; amount: number }> = {};
    for (let h = 7; h <= 22; h++) {
      hourly[`${String(h).padStart(2, '0')}:00`] = { count: 0, amount: 0 };
    }
    for (const s of sales as any[]) {
      const h = dayjs(s.createdAt).format('HH') + ':00';
      if (hourly[h]) {
        hourly[h].count++;
        hourly[h].amount += Number(s.totalAmount);
      }
    }

    const transactions = (sales as any[]).map((s: any) => ({
      id: s.id,
      source: 'sale',
      code: s.code ?? s.id.slice(0, 8),
      time: dayjs(s.createdAt).format('HH:mm'),
      customer: s.customer ? s.customer.name : 'Público General',
      itemsCount: (s.details ?? []).reduce((sum: number, i: any) => sum + i.quantity, 0),
      totalAmount: Number(s.totalAmount),
      paymentMethod: s.paymentMethod,
      paymentLabel: this.paymentLabel(s.paymentMethod),
    }));

    return {
      date: dayjs(date).format('DD/MM/YYYY'),
      dateIso: date,
      summary: {
        totalAmount: round2(totalAmount),
        totalSales,
        totalStoreIncomes: 0,
        transactionCount: totalSales,
        itemsSold,
        averageTicket: totalSales > 0 ? round2(totalAmount / totalSales) : 0,
        cash: round2(cash),
        digital: round2(digital),
      },
      paymentBreakdown,
      hourlyChart: {
        labels: Object.keys(hourly),
        amounts: Object.values(hourly).map((v) => round2(v.amount)),
        counts: Object.values(hourly).map((v) => v.count),
      },
      sales: transactions,
    };
  }

  // ── Sales Monthly Report ────────────────────────────────────────────────────
  async getMonthlySalesReport(month: string, warehouseId: string) {
    const monthStart = dayjs(`${month}-01`).startOf('month').toDate();
    const monthEnd   = dayjs(`${month}-01`).endOf('month').toDate();

    const [sales, paymentAggs] = await Promise.all([
      this.db.sale.findMany({
        where: { warehouseId, isDeleted: false, createdAt: { gte: monthStart, lte: monthEnd } },
        include: {
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }) as Promise<any[]>,
      this.db.salePayment.groupBy({
        by: ['method'],
        where: {
          sale: { warehouseId, isDeleted: false, createdAt: { gte: monthStart, lte: monthEnd } },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const paymentBreakdown = paymentAggs.map((p) => ({
      method: p.method,
      label: this.paymentLabel(p.method),
      amount: Number(p._sum.amount ?? 0),
      count: p._count.id,
    }));

    const totalAmount = (sales as any[]).reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const totalSales  = sales.length;
    const itemsSold   = (sales as any[]).reduce(
      (sum: number, s: any) => sum + (s.details ?? []).reduce((si: number, i: any) => si + i.quantity, 0),
      0,
    );
    const cashPayment = paymentBreakdown.find((p) => p.method === 'CASH');
    const cash = cashPayment ? cashPayment.amount : 0;
    const digital = totalAmount - cash;

    const daysInMonth = dayjs(`${month}-01`).daysInMonth();
    const dailyMap: Record<string, { count: number; amount: number; cash: number; digital: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayjs(`${month}-${String(d).padStart(2, '0')}`).format('YYYY-MM-DD');
      dailyMap[key] = { count: 0, amount: 0, cash: 0, digital: 0 };
    }

    for (const s of sales as any[]) {
      const key = dayjs(s.createdAt).format('YYYY-MM-DD');
      if (dailyMap[key]) {
        dailyMap[key].count++;
        const amt = Number(s.totalAmount);
        dailyMap[key].amount += amt;
        const salePs = (s.payments ?? []) as { method: string; amount: unknown }[];
        const saleCash = salePs
          .filter((p) => p.method === 'CASH')
          .reduce((sm, p) => sm + Number(p.amount), 0);
        dailyMap[key].cash += saleCash;
        dailyMap[key].digital += amt - saleCash;
      }
    }

    const daysWithSales = Object.values(dailyMap).filter((v) => v.count > 0).length;

    const dailyBreakdown = Object.entries(dailyMap).map(([dateKey, v]) => ({
      date: dayjs(dateKey).format('DD/MM/YYYY'),
      dayOfWeek: dayjs(dateKey).format('dddd'),
      transactions: v.count,
      total: round2(v.amount),
      cash: round2(v.cash),
      digital: round2(v.digital),
    }));

    const monthLabel = dayjs(`${month}-01`).format('MMMM YYYY');

    return {
      monthIso: month,
      monthLabel,
      summary: {
        totalAmount: round2(totalAmount),
        totalSales,
        totalStoreIncomes: 0,
        transactionCount: totalSales,
        itemsSold,
        averageTicket: totalSales > 0 ? round2(totalAmount / totalSales) : 0,
        cash: round2(cash),
        digital: round2(digital),
        averageDaily: daysWithSales > 0 ? round2(totalAmount / daysWithSales) : 0,
        daysWithSales,
      },
      paymentBreakdown,
      dailyBreakdown,
      dailyChart: {
        labels: dailyBreakdown.map((d) => d.date),
        amounts: dailyBreakdown.map((d) => d.total),
      },
    };
  }

  // ── Sales Period Report ─────────────────────────────────────────────────────
  async getPeriodSalesReport(startDate: string, endDate: string, warehouseId: string) {
    const start = dayjs(startDate).startOf('day').toDate();
    const end   = dayjs(endDate).endOf('day').toDate();

    const [sales, paymentAggs] = await Promise.all([
      this.db.sale.findMany({
        where: { warehouseId, isDeleted: false, createdAt: { gte: start, lte: end } },
        include: {
          payments: { select: { method: true, amount: true } },
          details: { select: { quantity: true } },
        },
        orderBy: { createdAt: 'asc' },
      }) as Promise<any[]>,
      this.db.salePayment.groupBy({
        by: ['method'],
        where: {
          sale: { warehouseId, isDeleted: false, createdAt: { gte: start, lte: end } },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const paymentBreakdown = paymentAggs.map((p) => ({
      method: p.method,
      label: this.paymentLabel(p.method),
      amount: Number(p._sum.amount ?? 0),
      count: p._count.id,
    }));

    const totalAmount = (sales as any[]).reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0);
    const totalSales  = sales.length;
    const itemsSold   = (sales as any[]).reduce(
      (sum: number, s: any) => sum + (s.details ?? []).reduce((si: number, i: any) => si + i.quantity, 0),
      0,
    );
    const cashPayment = paymentBreakdown.find((p) => p.method === 'CASH');
    const cash = cashPayment ? cashPayment.amount : 0;
    const digital = totalAmount - cash;

    const diffDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

    const dailyMap: Record<string, { count: number; amount: number; cash: number; digital: number }> = {};
    for (let d = 0; d < diffDays; d++) {
      const key = dayjs(startDate).add(d, 'day').format('YYYY-MM-DD');
      dailyMap[key] = { count: 0, amount: 0, cash: 0, digital: 0 };
    }

    for (const s of sales as any[]) {
      const key = dayjs(s.createdAt).format('YYYY-MM-DD');
      if (dailyMap[key]) {
        dailyMap[key].count++;
        const amt = Number(s.totalAmount);
        dailyMap[key].amount += amt;
        const salePs = (s.payments ?? []) as { method: string; amount: unknown }[];
        const saleCash = salePs
          .filter((p) => p.method === 'CASH')
          .reduce((sm, p) => sm + Number(p.amount), 0);
        dailyMap[key].cash += saleCash;
        dailyMap[key].digital += amt - saleCash;
      }
    }

    const daysWithSales = Object.values(dailyMap).filter((v) => v.count > 0).length;

    const dailyBreakdown = Object.entries(dailyMap).map(([dateKey, v]) => ({
      date: dayjs(dateKey).format('DD/MM/YYYY'),
      dayOfWeek: dayjs(dateKey).format('dddd'),
      transactions: v.count,
      total: round2(v.amount),
      cash: round2(v.cash),
      digital: round2(v.digital),
    }));

    return {
      startDate,
      endDate,
      periodLabel: `${dayjs(startDate).format('DD/MM/YYYY')} – ${dayjs(endDate).format('DD/MM/YYYY')}`,
      summary: {
        totalAmount: round2(totalAmount),
        totalSales,
        totalStoreIncomes: 0,
        transactionCount: totalSales,
        itemsSold,
        averageTicket: totalSales > 0 ? round2(totalAmount / totalSales) : 0,
        cash: round2(cash),
        digital: round2(digital),
        averageDaily: daysWithSales > 0 ? round2(totalAmount / daysWithSales) : 0,
        daysWithSales,
        daysInRange: diffDays,
      },
      paymentBreakdown,
      dailyBreakdown,
    };
  }

  // ── Products Inventory Report ───────────────────────────────────────────────
  async getProductsInventory(warehouseId: string) {
    const balances = await this.db.inventoryBalance.findMany({
      where: { warehouseId },
      include: {
        productSize: {
          include: {
            product: {
              select: { id: true, name: true },
            },
            size: { select: { id: true, description: true } },
          },
        },
        color: { select: { id: true, description: true, hash: true } },
      },
    }) as any[];

    type ProductMap = {
      id: string;
      name: string;
      sizes: Map<string, SizeEntry>;
    };

    type SizeEntry = {
      productSizeId: string;
      sizeId: string;
      size: string;
      stock: number;
      colors: { colorId: string; color: string; stock: number }[];
    };

    const productsMap = new Map<string, ProductMap>();

    for (const bal of balances) {
      const product = bal.productSize.product;
      if (!productsMap.has(product.id)) {
        productsMap.set(product.id, { id: product.id, name: product.name, sizes: new Map() });
      }
      const productEntry = productsMap.get(product.id)!;

      const psId = bal.productSizeId;
      if (!productEntry.sizes.has(psId)) {
        productEntry.sizes.set(psId, {
          productSizeId: psId,
          sizeId: bal.productSize.size.id,
          size: bal.productSize.size.description,
          stock: 0,
          colors: [],
        });
      }
      const sizeEntry = productEntry.sizes.get(psId)!;
      sizeEntry.stock += bal.quantity;
      sizeEntry.colors.push({
        colorId: bal.colorId,
        color: bal.color.description,
        stock: bal.quantity,
      });
    }

    return Array.from(productsMap.values()).map((p) => ({
      productId: p.id,
      product: p.name,
      totalStock: Array.from(p.sizes.values()).reduce((sum, s) => sum + s.stock, 0),
      sizes: Array.from(p.sizes.values()),
    }));
  }

  private paymentLabel(method: string): string {
    const map: Record<string, string> = {
      CASH: 'Efectivo',
      CARD: 'Tarjeta',
      YAPE: 'Yape',
      PLIN: 'Plin',
      TRANSFER: 'Transferencia',
    };
    return map[method] ?? method;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
