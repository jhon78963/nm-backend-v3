import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { SunatService } from '../sunat/sunat.service';
import dayjs from 'dayjs';

export interface SalesFilters {
  warehouseId: string;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
  status?: string;
  customerId?: string;
  search?: string;
  page?: number;
  perPage?: number;
}

/**
 * SalesService — Equivale a SaleService de Laravel.
 * Solo lecturas y operaciones post-checkout (anular, PDF, exchange).
 * La creación de ventas está en CheckoutService (proceso atómico).
 */
@Injectable()
export class SalesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly sunat: SunatService,
  ) {}

  async findAll(filters: SalesFilters) {
    const { warehouseId, dateFrom, dateTo, documentType, status, search, page = 1, perPage = 20 } = filters;

    const where = {
      warehouseId,
      isDeleted: false,
      ...(documentType && { documentType }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { fullInvoiceNumber: { contains: search } },
          { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: dayjs(dateFrom).startOf('day').toDate() }),
              ...(dateTo && { lte: dayjs(dateTo).endOf('day').toDate() }),
            },
          }
        : {}),
    };

    const [data, total] = await this.db.$transaction([
      this.db.sale.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, documentNumber: true } },
          payments: { select: { method: true, amount: true } },
          _count: { select: { details: true } },
        },
      }),
      this.db.sale.count({ where }),
    ]);

    return { data, meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) } };
  }

  async findById(id: string) {
    const sale = await this.db.sale.findFirst({
      where: { id, isDeleted: false },
      include: {
        customer: true,
        details: true,
        payments: true,
        electronicDocumentLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    return sale;
  }

  async delete(id: string, deletedById: string) {
    const sale = await this.db.sale.findFirst({ where: { id, isDeleted: false } });
    if (!sale) throw new NotFoundException('Venta no encontrada.');

    // Si tiene documento SUNAT aceptado, intentar anulación
    if (sale.sunatStatus === 'ACCEPTED' && sale.documentType !== 'TICKET') {
      await this.sunat.void(id, 'Anulación desde sistema').catch(() => null);
    }

    await this.db.sale.update({
      where: { id },
      data: { isDeleted: true, status: 'CANCELLED' },
    });
  }

  async getMonthlyStats(warehouseId: string, month: string) {
    // month formato: 'YYYY-MM'
    const from = dayjs(month, 'YYYY-MM').startOf('month').toDate();
    const to   = dayjs(month, 'YYYY-MM').endOf('month').toDate();

    const [salesCount, revenue, byPaymentMethod, byDocumentType] = await Promise.all([
      this.db.sale.count({ where: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } } }),

      this.db.sale.aggregate({
        where: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } },
        _sum: { totalAmount: true },
      }),

      this.db.salePayment.groupBy({
        by: ['method'],
        where: { sale: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } } },
        _sum: { amount: true },
      }),

      this.db.sale.groupBy({
        by: ['documentType'],
        where: { warehouseId, isDeleted: false, createdAt: { gte: from, lte: to } },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      month,
      totalSales: salesCount,
      totalRevenue: revenue._sum.totalAmount ?? 0,
      byPaymentMethod: Object.fromEntries(
        byPaymentMethod.map((r) => [r.method, r._sum.amount ?? 0]),
      ),
      byDocumentType: Object.fromEntries(
        byDocumentType.map((r) => [
          r.documentType ?? 'TICKET',
          { count: r._count.id, amount: r._sum.totalAmount ?? 0 },
        ]),
      ),
    };
  }

  /** Equivale a SaleController@exchange — tipo de cambio del día */
  async getExchangeRate(): Promise<{ compra: number; venta: number; fecha: string }> {
    try {
      const response = await fetch(
        'https://api.apis.net.pe/v1/tipo-cambio-sunat',
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) throw new Error('API no disponible');
      return response.json() as Promise<{ compra: number; venta: number; fecha: string }>;
    } catch {
      // Fallback: retorna valores conservadores para no bloquear el POS
      return { compra: 3.70, venta: 3.73, fecha: dayjs().format('YYYY-MM-DD') };
    }
  }
}
