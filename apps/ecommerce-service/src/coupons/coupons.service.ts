import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

import {
  DEFAULT_COUPONS,
  WELCOME_COUPON_CODE,
  type CouponDiscountType,
} from './constants/coupon-defaults';
import { CreateCouponDto, UpdateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

export interface ValidatedCouponResult {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
  discountAmount: number;
  description?: string | null;
}

export interface ResolvedCouponForOrder extends ValidatedCouponResult {
  couponId: string;
}

type CouponRecord = {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: Prisma.Decimal;
  minSubtotal: Prisma.Decimal;
  maxDiscount: Prisma.Decimal | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number;
  perIpLimit: number;
  isWelcome: boolean;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  warehouseId: string | null;
};

@Injectable()
export class CouponsService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaultCoupons();
  }

  async ensureDefaultCoupons(): Promise<void> {
    for (const coupon of DEFAULT_COUPONS) {
      await this.db.ecommerceCoupon.upsert({
        where: { code: coupon.code },
        create: {
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minSubtotal: coupon.minSubtotal,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          perCustomerLimit: coupon.perCustomerLimit,
          perIpLimit: coupon.perIpLimit,
          isWelcome: coupon.isWelcome,
          isActive: coupon.isActive,
        },
        update: {
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minSubtotal: coupon.minSubtotal,
          maxDiscount: coupon.maxDiscount,
          perCustomerLimit: coupon.perCustomerLimit,
          perIpLimit: coupon.perIpLimit,
          isWelcome: coupon.isWelcome,
        },
      });
    }
  }

  async validateCoupon(dto: ValidateCouponDto): Promise<ValidatedCouponResult> {
    const resolved = await this.resolveCoupon({
      code: dto.code,
      subtotal: dto.subtotal,
      customerId: dto.customerId,
      warehouseId: dto.warehouseId,
      clientIp: dto.clientIp,
    });

    return {
      code: resolved.code,
      discountType: resolved.discountType,
      discountValue: resolved.discountValue,
      discountAmount: resolved.discountAmount,
      description: resolved.description,
    };
  }

  async resolveCouponForOrder(
    code?: string | null,
    subtotal = 0,
    customerId?: string | null,
    warehouseId?: string | null,
    clientIp?: string | null,
  ): Promise<ResolvedCouponForOrder | null> {
    if (!code?.trim()) {
      return null;
    }

    return this.resolveCoupon({
      code,
      subtotal,
      customerId,
      warehouseId,
      clientIp,
    });
  }

  async assignWelcomeCoupon(customerId: string): Promise<ValidatedCouponResult | null> {
    const welcomeCoupon = await this.db.ecommerceCoupon.findFirst({
      where: { code: WELCOME_COUPON_CODE, isWelcome: true, isActive: true },
    });

    if (!welcomeCoupon) {
      return null;
    }

    await this.db.ecommerceCouponAssignment.upsert({
      where: {
        couponId_customerId: {
          couponId: welcomeCoupon.id,
          customerId,
        },
      },
      create: {
        couponId: welcomeCoupon.id,
        customerId,
      },
      update: {},
    });

    return {
      code: welcomeCoupon.code,
      discountType: welcomeCoupon.discountType as CouponDiscountType,
      discountValue: Number(welcomeCoupon.discountValue),
      discountAmount: 0,
      description: welcomeCoupon.description,
    };
  }

  async getWelcomeCouponForCustomer(
    customerId: string,
  ): Promise<ValidatedCouponResult | null> {
    const assignment = await this.db.ecommerceCouponAssignment.findFirst({
      where: {
        customerId,
        usedAt: null,
        coupon: {
          isWelcome: true,
          isActive: true,
        },
      },
      include: { coupon: true },
    });

    if (!assignment) {
      return null;
    }

    return {
      code: assignment.coupon.code,
      discountType: assignment.coupon.discountType as CouponDiscountType,
      discountValue: Number(assignment.coupon.discountValue),
      discountAmount: 0,
      description: assignment.coupon.description,
    };
  }

  async listAdminCoupons() {
    const coupons = await this.db.ecommerceCoupon.findMany({
      orderBy: [{ isWelcome: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      coupons: coupons.map((coupon) => this.mapCoupon(coupon)),
    };
  }

  async createCoupon(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const created = await this.db.ecommerceCoupon.create({
      data: {
        code,
        description: dto.description?.trim() || null,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minSubtotal: dto.minSubtotal ?? 0,
        maxDiscount: dto.maxDiscount ?? null,
        usageLimit: dto.usageLimit ?? null,
        perCustomerLimit: dto.perCustomerLimit ?? 1,
        perIpLimit: dto.perIpLimit ?? 0,
        isWelcome: dto.isWelcome ?? false,
        isActive: dto.isActive ?? true,
        warehouseId: dto.warehouseId ?? null,
      },
    });

    return { coupon: this.mapCoupon(created) };
  }

  async updateCoupon(id: string, dto: UpdateCouponDto) {
    const existing = await this.db.ecommerceCoupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Cupón no encontrado.');
    }

    const updated = await this.db.ecommerceCoupon.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minSubtotal: dto.minSubtotal,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perCustomerLimit: dto.perCustomerLimit,
        perIpLimit: dto.perIpLimit,
        isActive: dto.isActive,
        warehouseId: dto.warehouseId,
      },
    });

    return { coupon: this.mapCoupon(updated) };
  }

  async redeemCoupon(
    tx: Prisma.TransactionClient,
    params: {
      couponId: string;
      orderId: string;
      customerId?: string | null;
      clientIp?: string | null;
      discountAmount: number;
    },
  ): Promise<void> {
    await tx.ecommerceCoupon.update({
      where: { id: params.couponId },
      data: { usageCount: { increment: 1 } },
    });

    await tx.ecommerceCouponRedemption.create({
      data: {
        couponId: params.couponId,
        orderId: params.orderId,
        customerId: params.customerId ?? null,
        clientIp: params.clientIp ?? null,
        discountAmount: new Decimal(params.discountAmount).toDecimalPlaces(2).toNumber(),
      },
    });

    if (params.customerId) {
      await tx.ecommerceCouponAssignment.updateMany({
        where: {
          couponId: params.couponId,
          customerId: params.customerId,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });
    }
  }

  private async resolveCoupon(params: {
    code: string;
    subtotal: number;
    customerId?: string | null;
    warehouseId?: string | null;
    clientIp?: string | null;
  }): Promise<ResolvedCouponForOrder> {
    const normalizedCode = params.code.trim().toUpperCase();
    const coupon = await this.db.ecommerceCoupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new BadRequestException('Cupón no válido.');
    }

    await this.assertCouponIsUsable(
      coupon,
      params.customerId,
      params.warehouseId,
      params.clientIp,
    );

    const subtotal = Number(params.subtotal);
    const minSubtotal = Number(coupon.minSubtotal);
    if (subtotal < minSubtotal) {
      throw new BadRequestException(
        `Este cupón requiere un subtotal mínimo de S/ ${minSubtotal.toFixed(2)}.`,
      );
    }

    const discountAmount = this.calculateDiscountAmount(coupon, subtotal);
    if (discountAmount <= 0) {
      throw new BadRequestException('El cupón no aplica para este pedido.');
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as CouponDiscountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      description: coupon.description,
    };
  }

  private async assertCouponIsUsable(
    coupon: CouponRecord,
    customerId?: string | null,
    warehouseId?: string | null,
    clientIp?: string | null,
  ): Promise<void> {
    if (!coupon.isActive) {
      throw new BadRequestException('Cupón no válido.');
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('Este cupón aún no está disponible.');
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('Este cupón ha expirado.');
    }

    if (coupon.warehouseId && warehouseId && coupon.warehouseId !== warehouseId) {
      throw new BadRequestException('Este cupón no aplica para esta tienda.');
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Este cupón ya alcanzó su límite de uso.');
    }

    await this.assertIpLimit(coupon, clientIp);

    if (!customerId) {
      throw new BadRequestException('Debes iniciar sesión para usar cupones.');
    }

    if (coupon.isWelcome) {
      const assignment = await this.db.ecommerceCouponAssignment.findUnique({
        where: {
          couponId_customerId: {
            couponId: coupon.id,
            customerId,
          },
        },
      });

      if (!assignment || assignment.usedAt) {
        throw new BadRequestException('Este cupón de bienvenida no está disponible.');
      }

      return;
    }

    if (coupon.perCustomerLimit > 0) {
      const customerUses = await this.db.ecommerceCouponRedemption.count({
        where: {
          couponId: coupon.id,
          customerId,
        },
      });

      if (customerUses >= coupon.perCustomerLimit) {
        throw new BadRequestException('Ya usaste este cupón el máximo de veces permitido.');
      }
    }
  }

  private async assertIpLimit(coupon: CouponRecord, clientIp?: string | null): Promise<void> {
    if (coupon.perIpLimit <= 0 || !clientIp?.trim()) {
      return;
    }

    const ipUses = await this.db.ecommerceCouponRedemption.count({
      where: {
        couponId: coupon.id,
        clientIp: clientIp.trim(),
      },
    });

    if (ipUses >= coupon.perIpLimit) {
      throw new BadRequestException('Este cupón ya fue usado desde esta conexión.');
    }
  }

  private calculateDiscountAmount(coupon: CouponRecord, subtotal: number): number {
    const value = Number(coupon.discountValue);

    if (coupon.discountType === 'fixed') {
      return Math.min(subtotal, value);
    }

    const raw = new Decimal(subtotal).mul(value).div(100);
    const maxDiscount = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null;
    const capped = maxDiscount != null ? Decimal.min(raw, maxDiscount) : raw;

    return Decimal.min(capped, subtotal).toDecimalPlaces(2).toNumber();
  }

  private mapCoupon(coupon: CouponRecord) {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      minSubtotal: Number(coupon.minSubtotal),
      maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      perCustomerLimit: coupon.perCustomerLimit,
      perIpLimit: coupon.perIpLimit,
      isWelcome: coupon.isWelcome,
      isActive: coupon.isActive,
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      warehouseId: coupon.warehouseId,
    };
  }
}
