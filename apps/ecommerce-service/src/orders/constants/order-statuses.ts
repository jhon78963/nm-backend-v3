export const ECOMMERCE_ORDER_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'out-for-delivery',
  'delivered',
  'cancelled',
] as const;

export type EcommerceOrderStatus = (typeof ECOMMERCE_ORDER_STATUSES)[number];

export const ECOMMERCE_ORDER_STATUS_LABELS: Record<EcommerceOrderStatus, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  shipped: 'Enviado',
  'out-for-delivery': 'En reparto',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export function isEcommerceOrderStatus(value: string): value is EcommerceOrderStatus {
  return (ECOMMERCE_ORDER_STATUSES as readonly string[]).includes(value);
}
