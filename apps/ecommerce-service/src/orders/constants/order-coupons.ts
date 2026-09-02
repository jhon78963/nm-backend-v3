const VALID_COUPONS: Record<string, number> = {
  BIENVENIDO10: 10,
  MARITEX5: 5,
};

export function resolveCouponDiscount(code?: string | null): number {
  if (!code?.trim()) {
    return 0;
  }

  const normalized = code.trim().toUpperCase();
  const discount = VALID_COUPONS[normalized];

  if (discount === undefined) {
    return -1;
  }

  return discount;
}
