import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@app/database';

import type { AuthenticatedCustomer } from '../customer-auth/types/authenticated-customer.type';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ListProductReviewsAdminQueryDto } from './dto/list-product-reviews-admin-query.dto';
import { ModerateProductReviewDto } from './dto/moderate-product-review.dto';
import { detectProfanity } from './utils/profanity-filter.util';
import {
  buildReviewSummary,
  mapPublicReview,
  type ProductReviewStatus,
} from './utils/review-summary.util';

const ELIGIBLE_ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'out-for-delivery',
  'delivered',
];

@Injectable()
export class ProductReviewsService {
  constructor(private readonly db: DatabaseService) {}

  async getProductReviews(productId: string, customer?: AuthenticatedCustomer) {
    await this.ensureProductExists(productId);

    const approvedReviews = await this.db.productReview.findMany({
      where: { productId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
      },
    });

    const summary = buildReviewSummary(approvedReviews);

    let userReview = null;
    let canReview = false;
    let purchaseRequired = true;

    if (customer) {
      const existing = await this.db.productReview.findUnique({
        where: {
          productId_customerId: {
            productId,
            customerId: customer.id,
          },
        },
        include: {
          customer: { select: { name: true } },
        },
      });

      if (existing) {
        userReview = {
          ...mapPublicReview(existing),
          status: existing.status,
          rejectionReason: existing.rejectionReason,
        };
      } else {
        const purchase = await this.findVerifiedPurchase(customer, productId);
        canReview = purchase !== null;
        purchaseRequired = purchase === null;
      }
    }

    return {
      reviews: approvedReviews.map(mapPublicReview),
      summary,
      canReview,
      purchaseRequired,
      userReview,
    };
  }

  async createProductReview(
    productId: string,
    customer: AuthenticatedCustomer,
    dto: CreateProductReviewDto,
  ) {
    await this.ensureProductExists(productId);

    const existing = await this.db.productReview.findUnique({
      where: {
        productId_customerId: {
          productId,
          customerId: customer.id,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya publicaste una reseña para este producto.');
    }

    const purchase = await this.findVerifiedPurchase(customer, productId);
    if (!purchase) {
      throw new ForbiddenException(
        'Solo los clientes que compraron este producto pueden dejar una reseña.',
      );
    }

    const profanity = detectProfanity(dto.description);
    const status: ProductReviewStatus = profanity.hasProfanity ? 'rejected' : 'pending';
    const rejectionReason = profanity.hasProfanity
      ? 'La reseña contiene lenguaje inapropiado y fue rechazada automáticamente.'
      : null;

    const review = await this.db.productReview.create({
      data: {
        productId,
        customerId: customer.id,
        orderId: purchase.id,
        rating: dto.rating,
        description: dto.description.trim(),
        status,
        rejectionReason,
        moderatedAt: profanity.hasProfanity ? new Date() : null,
      },
      include: {
        customer: { select: { name: true } },
      },
    });

    return {
      review: {
        ...mapPublicReview(review),
        status: review.status,
        rejectionReason: review.rejectionReason,
      },
      message: profanity.hasProfanity
        ? 'Tu reseña fue rechazada por contener lenguaje inapropiado.'
        : 'Tu reseña fue enviada y está pendiente de aprobación.',
    };
  }

  async listAdminReviews(query: ListProductReviewsAdminQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where = query.status ? { status: query.status } : {};

    const [reviews, total] = await Promise.all([
      this.db.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: perPage,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
          order: { select: { orderNumber: true } },
        },
      }),
      this.db.productReview.count({ where }),
    ]);

    return {
      reviews: reviews.map((review) => ({
        id: review.id,
        productId: review.productId,
        productName: review.product.name,
        customerId: review.customer.id,
        customerName: review.customer.name,
        customerEmail: review.customer.email,
        orderNumber: review.order.orderNumber,
        rating: review.rating,
        description: review.description,
        status: review.status,
        rejectionReason: review.rejectionReason,
        createdAt: review.createdAt,
        moderatedAt: review.moderatedAt,
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    };
  }

  async moderateReview(
    reviewId: string,
    dto: ModerateProductReviewDto,
    moderatorId: string,
  ) {
    const review = await this.db.productReview.findFirst({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Reseña no encontrada.');
    }

    if (review.status === 'approved' && dto.status === 'approved') {
      throw new BadRequestException('La reseña ya está aprobada.');
    }

    const updated = await this.db.productReview.update({
      where: { id: reviewId },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === 'rejected'
            ? dto.rejectionReason?.trim() || 'Rechazada por moderación.'
            : null,
        moderatedById: moderatorId,
        moderatedAt: new Date(),
      },
      include: {
        customer: { select: { name: true } },
        product: { select: { id: true, name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      productName: updated.product.name,
      customerName: updated.customer.name,
      orderNumber: updated.order.orderNumber,
      moderatedAt: updated.moderatedAt,
    };
  }

  async getReviewStatsForProducts(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<string, { averageRating: number; reviewsCount: number }>();
    }

    const grouped = await this.db.productReview.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        status: 'approved',
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return new Map(
      grouped.map((row) => [
        row.productId,
        {
          averageRating: Math.round((row._avg.rating ?? 0) * 100) / 100,
          reviewsCount: row._count._all,
        },
      ]),
    );
  }

  private async ensureProductExists(productId: string) {
    const product = await this.db.product.findFirst({
      where: { id: productId, isDeleted: false },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }
  }

  private async findVerifiedPurchase(customer: AuthenticatedCustomer, productId: string) {
    return this.db.ecommerceOrder.findFirst({
      where: {
        email: customer.email.toLowerCase(),
        status: { in: ELIGIBLE_ORDER_STATUSES },
        items: { some: { productId } },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
  }
}
