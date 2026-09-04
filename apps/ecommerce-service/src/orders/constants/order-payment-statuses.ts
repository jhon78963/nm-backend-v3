export const ECOMMERCE_PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  failed: 'Fallido',
  reviewing: 'Validando',
  refunded: 'Reembolsado',
};

export function getPaymentStatusLabel(status: string): string {
  return ECOMMERCE_PAYMENT_STATUS_LABELS[status] ?? status;
}
