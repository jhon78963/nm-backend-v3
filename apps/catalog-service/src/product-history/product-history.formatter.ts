import dayjs from 'dayjs';

type JsonRecord = Record<string, unknown>;

export interface FormattedProductHistoryRow {
  id: string;
  date: string;
  time: string;
  user: string;
  action_title: string;
  changes: Array<{ field: string; from: string | number; to: string | number }>;
  severity: string;
  icon: string;
}

interface HistoryLogInput {
  id: string;
  eventType: string;
  oldValues: unknown;
  newValues: unknown;
  createdAt: Date;
  createdBy: { name: string; surname: string; username: string } | null;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  stock: 'Stock',
  salePrice: 'Precio Venta',
  sale_price: 'Precio Venta',
  purchasePrice: 'Precio Compra',
  purchase_price: 'Precio Compra',
  minSalePrice: 'Precio Mínimo',
  min_sale_price: 'Precio Mínimo',
  status: 'Estado',
  barcode: 'Código Barras',
  description: 'Descripción',
  shortDescription: 'Descripción corta',
  additionalInfo: 'Información adicional',
  percentageDiscount: 'Descuento %',
  cashDiscount: 'Descuento efectivo',
  isOnSale: 'En oferta',
  isFeatured: 'Destacado',
  isNew: 'Producto nuevo',
};

const SKIP_KEYS = new Set([
  'id',
  'productId',
  'product_id',
  'sizeId',
  'size_id',
  'size_id_ref',
  'colorId',
  'color_id',
  'color_name',
  'productSizeId',
  'product_size_id',
  'createdAt',
  'updatedAt',
  'createdById',
  'updatedById',
  'deletedById',
  'warehouseId',
  'genderId',
  'vendorId',
  'isDeleted',
  'deletionTime',
  'wooStatus',
  'size',
  'order_number',
]);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function formatUser(user: HistoryLogInput['createdBy']): string {
  if (!user) return 'Sistema';
  const fullName = `${user.name ?? ''} ${user.surname ?? ''}`.trim();
  return fullName || user.username || 'Sistema';
}

function formatDateParts(createdAt: Date): { date: string; time: string } {
  const value = dayjs(createdAt);
  return {
    date: value.format('DD/MM/YYYY'),
    time: value.format('hh:mm A'),
  };
}

function getSizeLabel(newValues: JsonRecord, oldValues: JsonRecord): string {
  const size = asRecord(newValues.size ?? oldValues.size);
  const description = size.description;
  return typeof description === 'string' && description.trim()
    ? ` (${description.trim()})`
    : '';
}

function getSizeSuffix(newValues: JsonRecord, oldValues: JsonRecord): string {
  const size = asRecord(newValues.size ?? oldValues.size);
  const description = size.description;
  return typeof description === 'string' && description.trim()
    ? ` en Talla ${description.trim()}`
    : '';
}

function getColorLabel(newValues: JsonRecord, oldValues: JsonRecord): string {
  const colorName = newValues.color_name ?? oldValues.color_name;
  return typeof colorName === 'string' && colorName.trim()
    ? ` (${colorName.trim()})`
    : '';
}

function getOrderNumberSuffix(newValues: JsonRecord, oldValues: JsonRecord): string {
  const orderNumber = newValues.order_number ?? oldValues.order_number;
  return typeof orderNumber === 'string' && orderNumber.trim()
    ? ` (pedido ${orderNumber.trim()})`
    : '';
}

function getActionTitle(log: HistoryLogInput): string {
  const oldValues = asRecord(log.oldValues);
  const newValues = asRecord(log.newValues);
  const sizeLabel = getSizeLabel(newValues, oldValues);
  const sizeSuffix = getSizeSuffix(newValues, oldValues);
  const colorLabel = getColorLabel(newValues, oldValues);
  const orderSuffix = getOrderNumberSuffix(newValues, oldValues);

  switch (log.eventType) {
    case 'CREATED':
      return 'Creación de Producto';
    case 'UPDATED':
      return 'Actualización de Producto';
    case 'SIZE_ADDED':
      return `Creación de Talla${sizeLabel}`;
    case 'SIZE_PRICE_UPDATED':
      return `Actualización de Talla${sizeLabel}`;
    case 'SIZE_STOCK_UPDATED':
      return `Actualización de stock de Talla${sizeLabel}`;
    case 'SIZE_REMOVED':
      return `Eliminación de Talla${sizeLabel}`;
    case 'COLOR_ADDED':
      return `Asignación de color${colorLabel}${sizeSuffix}`;
    case 'COLOR_STOCK_UPDATED':
      return `Actualización de stock de color${colorLabel}${sizeSuffix}`;
    case 'COLOR_REMOVED':
      return `Eliminación de Stock/Color${colorLabel}${sizeSuffix}`;
    case 'ECOMMERCE_ORDER_STOCK':
      return `Venta ecommerce — stock${colorLabel}${sizeSuffix}${orderSuffix}`;
    case 'ECOMMERCE_ORDER_CANCEL_STOCK':
      return `Cancelación de pedido — devolución de stock${colorLabel}${sizeSuffix}${orderSuffix}`;
    default:
      return 'Movimiento de Producto';
  }
}

function getSeverity(eventType: string): string {
  switch (eventType) {
    case 'CREATED':
    case 'SIZE_ADDED':
    case 'COLOR_ADDED':
      return 'success';
    case 'UPDATED':
    case 'SIZE_PRICE_UPDATED':
    case 'SIZE_STOCK_UPDATED':
    case 'COLOR_STOCK_UPDATED':
      return 'info';
    case 'ECOMMERCE_ORDER_STOCK':
      return 'warning';
    case 'ECOMMERCE_ORDER_CANCEL_STOCK':
      return 'success';
    case 'SIZE_REMOVED':
    case 'COLOR_REMOVED':
      return 'danger';
    default:
      return 'secondary';
  }
}

function getIcon(eventType: string): string {
  switch (eventType) {
    case 'CREATED':
    case 'SIZE_ADDED':
    case 'COLOR_ADDED':
      return 'pi pi-plus';
    case 'SIZE_REMOVED':
    case 'COLOR_REMOVED':
      return 'pi pi-trash';
    case 'UPDATED':
    case 'SIZE_PRICE_UPDATED':
    case 'SIZE_STOCK_UPDATED':
    case 'COLOR_STOCK_UPDATED':
      return 'pi pi-pencil';
    case 'ECOMMERCE_ORDER_STOCK':
      return 'pi pi-shopping-cart';
    case 'ECOMMERCE_ORDER_CANCEL_STOCK':
      return 'pi pi-undo';
    default:
      return 'pi pi-info-circle';
  }
}

function formatValue(value: unknown): string | number {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function formatChanges(
  oldValues: unknown,
  newValues: unknown,
  eventType: string,
): FormattedProductHistoryRow['changes'] {
  const oldRecord = asRecord(oldValues);
  const newRecord = asRecord(newValues);
  const changes: FormattedProductHistoryRow['changes'] = [];

  if (
    (eventType === 'SIZE_REMOVED' || eventType === 'COLOR_REMOVED') &&
    Object.keys(oldRecord).length > 0 &&
    Object.keys(newRecord).length === 0
  ) {
    for (const [key, value] of Object.entries(oldRecord)) {
      if (SKIP_KEYS.has(key)) continue;
      changes.push({
        field: FIELD_LABELS[key] ?? key,
        from: formatValue(value),
        to: 'ELIMINADO',
      });
    }
    return changes;
  }

  if (eventType === 'COLOR_ADDED' || eventType === 'COLOR_REMOVED') {
    const colorName = newRecord.color_name ?? oldRecord.color_name;
    if (colorName) {
      changes.push({
        field: 'Color',
        from: formatValue(oldRecord.color_name),
        to: formatValue(colorName),
      });
    }
  }

  for (const [key, value] of Object.entries(newRecord)) {
    if (SKIP_KEYS.has(key)) continue;
    const oldValue = oldRecord[key];
    const from = formatValue(oldValue);
    const to = formatValue(value);
    if (from !== to) {
      changes.push({
        field: FIELD_LABELS[key] ?? key,
        from,
        to,
      });
    }
  }

  return changes;
}

export function formatProductHistoryLog(log: HistoryLogInput): FormattedProductHistoryRow {
  const { date, time } = formatDateParts(log.createdAt);

  return {
    id: log.id,
    date,
    time,
    user: formatUser(log.createdBy),
    action_title: getActionTitle(log),
    changes: formatChanges(log.oldValues, log.newValues, log.eventType),
    severity: getSeverity(log.eventType),
    icon: getIcon(log.eventType),
  };
}
