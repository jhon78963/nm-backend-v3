import type { DatabaseService } from '@app/database';

type HistoryTx = Pick<
  DatabaseService,
  'productHistory' | 'productSize' | 'color'
>;

export type ProductStockHistoryEventType =
  | 'COLOR_STOCK_UPDATED'
  | 'ECOMMERCE_ORDER_STOCK'
  | 'ECOMMERCE_ORDER_CANCEL_STOCK';

interface RecordProductColorStockHistoryOptions {
  productId: string;
  productSizeId: string;
  colorId: string;
  oldStock: number;
  newStock: number;
  createdById: string;
  eventType: ProductStockHistoryEventType;
  reason?: string;
  orderNumber?: string;
}

export async function recordProductColorStockHistory(
  tx: HistoryTx,
  opts: RecordProductColorStockHistoryOptions,
): Promise<void> {
  const productSize = await tx.productSize.findFirst({
    where: { id: opts.productSizeId, isDeleted: false },
    include: {
      size: { select: { id: true, description: true } },
    },
  });

  if (!productSize) {
    return;
  }

  const color = await tx.color.findFirst({
    where: { id: opts.colorId, isDeleted: false },
    select: { id: true, description: true },
  });

  if (!color) {
    return;
  }

  const context = {
    stock: opts.newStock,
    color_name: color.description,
    color_id: color.id,
    product_size_id: opts.productSizeId,
    size_id_ref: productSize.sizeId,
    size: productSize.size,
    ...(opts.orderNumber ? { order_number: opts.orderNumber } : {}),
  };

  await tx.productHistory.create({
    data: {
      productId: opts.productId,
      eventType: opts.eventType,
      reason: opts.reason,
      oldValues: {
        stock: opts.oldStock,
        color_name: color.description,
        product_size_id: opts.productSizeId,
        size_id_ref: productSize.sizeId,
        size: productSize.size,
        ...(opts.orderNumber ? { order_number: opts.orderNumber } : {}),
      },
      newValues: context,
      createdById: opts.createdById,
    },
  });
}
