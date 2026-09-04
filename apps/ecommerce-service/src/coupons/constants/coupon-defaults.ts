export const WELCOME_COUPON_CODE = 'BIENVENIDA10';

export const DEFAULT_COUPONS = [
  {
    code: WELCOME_COUPON_CODE,
    description: 'Cupón de bienvenida — 10% de descuento en tu primera compra',
    discountType: 'percentage' as const,
    discountValue: 10,
    minSubtotal: 20,
    maxDiscount: 30,
    usageLimit: null,
    perCustomerLimit: 1,
    perIpLimit: 1,
    isWelcome: true,
    isActive: true,
  },
  {
    code: 'MARITEX5',
    description: 'Descuento fijo de S/ 5',
    discountType: 'fixed' as const,
    discountValue: 5,
    minSubtotal: 15,
    maxDiscount: null,
    usageLimit: null,
    perCustomerLimit: 1,
    perIpLimit: 1,
    isWelcome: false,
    isActive: true,
  },
] as const;

export type CouponDiscountType = 'percentage' | 'fixed';
