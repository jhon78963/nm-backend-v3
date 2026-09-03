import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@app/database';

import { ListAdminCustomerOrdersQueryDto } from './dto/list-admin-customer-orders-query.dto';
import { ListAdminCustomersQueryDto } from './dto/list-admin-customers-query.dto';
import {
  ADMIN_REFUND_STATUSES,
  UpdateAdminRefundDto,
} from './dto/update-admin-refund.dto';
import { UpdateAdminCustomerDto } from './dto/update-admin-customer.dto';
import {
  ECOMMERCE_ORDER_STATUS_LABELS,
} from '../orders/constants/order-statuses';

@Injectable()
export class AdminCustomersService {
  constructor(private readonly db: DatabaseService) {}

  async listAdminCustomers(query: ListAdminCustomersQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where = {
      ...(query.isEnabled !== undefined ? { isEnabled: query.isEnabled } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.db.ecommerceCustomer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true,
          email: true,
          name: true,
          isEnabled: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              refunds: true,
              reviews: true,
            },
          },
        },
      }),
      this.db.ecommerceCustomer.count({ where }),
    ]);

    const customersWithStats = await Promise.all(
      customers.map(async (customer) => ({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        isEnabled: customer.isEnabled,
        userId: customer.userId,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        orderCount: customer._count.orders,
        refundCount: customer._count.refunds,
        reviewCount: customer._count.reviews,
        totalSpent: await this.getCustomerTotalSpent(customer.id),
      })),
    );

    return {
      customers: customersWithStats,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  async getAdminCustomer(id: string) {
    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            isEnabled: true,
            username: true,
          },
        },
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        },
        notificationSettings: true,
        _count: {
          select: {
            orders: true,
            refunds: true,
            reviews: true,
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const [totalSpent, guestOrderCount] = await Promise.all([
      this.getCustomerTotalSpent(customer.id),
      this.db.ecommerceOrder.count({
        where: {
          email: { equals: customer.email, mode: 'insensitive' },
          customerId: null,
        },
      }),
    ]);

    return {
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        isEnabled: customer.isEnabled,
        userId: customer.userId,
        userPhone: customer.user?.phone ?? null,
        userIsEnabled: customer.user?.isEnabled ?? null,
        username: customer.user?.username ?? null,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      stats: {
        orderCount: customer._count.orders,
        refundCount: customer._count.refunds,
        reviewCount: customer._count.reviews,
        totalSpent,
        guestOrderCount,
      },
      addresses: customer.addresses,
      notificationSettings: customer.notificationSettings ?? {
        orderUpdates: true,
        promotions: true,
        newsletter: true,
      },
    };
  }

  async listCustomerOrders(customerId: string, query: ListAdminCustomerOrdersQueryDto) {
    await this.ensureCustomerExists(customerId);

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const customer = await this.db.ecommerceCustomer.findFirst({
      where: { id: customerId },
      select: { email: true },
    });

    const where = {
      ...(query.status ? { status: query.status } : {}),
      OR: [
        { customerId },
        {
          customerId: null,
          email: { equals: customer?.email ?? '', mode: 'insensitive' as const },
        },
      ],
    };

    const [orders, total] = await Promise.all([
      this.db.ecommerceOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        include: { items: true },
      }),
      this.db.ecommerceOrder.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.mapAdminOrderSummary(order)),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  async listCustomerRefunds(customerId: string) {
    await this.ensureCustomerExists(customerId);

    const refunds = await this.db.ecommerceRefund.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    return {
      refunds: refunds.map((refund) => this.mapRefund(refund)),
    };
  }

  async listCustomerReviews(customerId: string) {
    await this.ensureCustomerExists(customerId);

    const reviews = await this.db.productReview.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        productName: review.product.name,
        orderNumber: review.order.orderNumber,
        rating: review.rating,
        description: review.description,
        status: review.status,
        rejectionReason: review.rejectionReason,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
    };
  }

  async listCustomerNotifications(customerId: string) {
    await this.ensureCustomerExists(customerId);

    const notifications = await this.db.ecommerceCustomerNotification.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { notifications };
  }

  async updateAdminCustomer(id: string, dto: UpdateAdminCustomerDto) {
    await this.ensureCustomerExists(id);

    const customer = await this.db.ecommerceCustomer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isEnabled: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { customer };
  }

  async updateAdminRefund(id: string, dto: UpdateAdminRefundDto) {
    const refund = await this.db.ecommerceRefund.findFirst({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentStatus: true,
          },
        },
        customer: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Reembolso no encontrado.');
    }

    if (dto.status && !ADMIN_REFUND_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Estado de reembolso no válido.');
    }

    const updated = await this.db.ecommerceRefund.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.adminNotes !== undefined ? { adminNotes: dto.adminNotes.trim() || null } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (dto.status && dto.status !== refund.status) {
      await this.db.ecommerceCustomerNotification.create({
        data: {
          customerId: refund.customerId,
          type: 'refund',
          title: this.getRefundNotificationTitle(dto.status),
          message: this.getRefundNotificationMessage(updated.order.orderNumber, dto.status),
          metadata: {
            refundId: updated.id,
            orderNumber: updated.order.orderNumber,
            status: dto.status,
          },
        },
      });
    }

    return { refund: this.mapRefund(updated) };
  }

  private async getCustomerTotalSpent(customerId: string): Promise<number> {
    const result = await this.db.ecommerceOrder.aggregate({
      where: {
        customerId,
        paymentStatus: 'paid',
        status: { not: 'cancelled' },
      },
      _sum: { total: true },
    });

    return Number(result._sum.total ?? 0);
  }

  private async ensureCustomerExists(customerId: string) {
    const exists = await this.db.ecommerceCustomer.findFirst({
      where: { id: customerId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Cliente no encontrado.');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapAdminOrderSummary(order: any) {
    const billing = order.billingAddress as {
      firstName?: string;
      lastName?: string;
    } | null;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel:
        ECOMMERCE_ORDER_STATUS_LABELS[
          order.status as keyof typeof ECOMMERCE_ORDER_STATUS_LABELS
        ] ?? order.status,
      paymentStatus: order.paymentStatus,
      email: order.email,
      customerId: order.customerId,
      isGuestOrder: !order.customerId,
      customerName: billing
        ? [billing.firstName, billing.lastName].filter(Boolean).join(' ')
        : '',
      total: Number(order.total),
      itemCount: order.items?.length ?? 0,
      createdAt: order.createdAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRefund(refund: any) {
    return {
      id: refund.id,
      status: refund.status,
      reason: refund.reason,
      amount: refund.amount !== null ? Number(refund.amount) : null,
      adminNotes: refund.adminNotes,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
      order: refund.order
        ? {
            id: refund.order.id,
            orderNumber: refund.order.orderNumber,
            total: Number(refund.order.total),
            status: refund.order.status,
            paymentStatus: refund.order.paymentStatus,
          }
        : null,
      customer: refund.customer
        ? {
            id: refund.customer.id,
            email: refund.customer.email,
            name: refund.customer.name,
          }
        : undefined,
    };
  }

  private getRefundNotificationTitle(status: string): string {
    switch (status) {
      case 'approved':
        return 'Reembolso aprobado';
      case 'rejected':
        return 'Reembolso rechazado';
      case 'completed':
        return 'Reembolso completado';
      default:
        return 'Actualización de reembolso';
    }
  }

  private getRefundNotificationMessage(orderNumber: string, status: string): string {
    switch (status) {
      case 'approved':
        return `Tu solicitud de reembolso para el pedido #${orderNumber} fue aprobada.`;
      case 'rejected':
        return `Tu solicitud de reembolso para el pedido #${orderNumber} fue rechazada.`;
      case 'completed':
        return `El reembolso del pedido #${orderNumber} fue completado.`;
      default:
        return `Actualizamos el estado de tu reembolso del pedido #${orderNumber}.`;
    }
  }
}
