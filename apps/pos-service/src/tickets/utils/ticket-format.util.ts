export function formatMoney(value: number): string {
  return value.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTicketDate(value: Date | string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function paymentLabel(method?: string | null): string {
  switch ((method ?? '').toUpperCase().trim()) {
    case 'CASH':
      return 'CONTADO';
    case 'CARD':
      return 'TARJETA';
    case 'YAPE':
      return 'YAPE';
    case 'PLIN':
      return 'PLIN';
    case 'MIXED':
    case 'MIXTO':
      return 'MIXTO';
    default:
      return (method ?? '').toUpperCase().trim() || 'CONTADO';
  }
}

export function emailForTicket(email?: string | null): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return escapeHtml(email);
  return `${escapeHtml(parts[0])}&#64;${escapeHtml(parts[1])}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function upper(value?: string | null): string {
  return (value ?? '').toUpperCase();
}
