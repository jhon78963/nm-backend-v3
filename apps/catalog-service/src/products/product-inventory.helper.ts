import type { DatabaseService } from '@app/database';

type InventoryTx = Pick<
  DatabaseService,
  'productSizeColor' | 'color' | 'inventoryBalance'
>;

export async function getNoColorId(
  tx: Pick<DatabaseService, 'color'>,
): Promise<string | null> {
  const existing = await tx.color.findFirst({
    where: { description: 'Sin color', isDeleted: false },
  });
  return existing?.id ?? null;
}

export async function getOrCreateNoColorId(
  tx: Pick<DatabaseService, 'color'>,
): Promise<string> {
  const existing = await getNoColorId(tx);
  if (existing) return existing;

  const created = await tx.color.create({
    data: {
      description: 'Sin color',
      hash: '#CCCCCC',
    },
  });
  return created.id;
}

export async function syncMasterBalanceToColorSum(
  tx: InventoryTx,
  warehouseId: string,
  productSizeId: string,
) {
  const colorLinks = await tx.productSizeColor.findMany({
    where: { productSizeId },
    select: { colorId: true },
  });
  if (colorLinks.length === 0) return;

  const noColorId = await getOrCreateNoColorId(tx);
  let total = 0;

  for (const link of colorLinks) {
    const balance = await tx.inventoryBalance.findFirst({
      where: {
        warehouseId,
        productSizeId,
        colorId: link.colorId,
      },
      select: { quantity: true },
    });
    total += balance?.quantity ?? 0;
  }

  await tx.inventoryBalance.upsert({
    where: {
      warehouseId_productSizeId_colorId: {
        warehouseId,
        productSizeId,
        colorId: noColorId,
      },
    },
    update: { quantity: total },
    create: {
      warehouseId,
      productSizeId,
      colorId: noColorId,
      quantity: total,
    },
  });
}

type StockLookupTx = Pick<
  DatabaseService,
  'color' | 'inventoryBalance' | 'productSizeColor'
>;

export async function buildMasterStockByProductSizeId(
  tx: StockLookupTx,
  warehouseId: string,
  productSizeIds: string[],
): Promise<Map<string, number>> {
  const stockByProductSizeId = new Map<string, number>();
  if (productSizeIds.length === 0) {
    return stockByProductSizeId;
  }

  const noColorId = await getNoColorId(tx);
  const colorLinks = await tx.productSizeColor.findMany({
    where: { productSizeId: { in: productSizeIds } },
    select: { productSizeId: true, colorId: true },
  });

  const linkedColorsByProductSizeId = new Map<string, string[]>();
  for (const link of colorLinks) {
    const list = linkedColorsByProductSizeId.get(link.productSizeId) ?? [];
    list.push(link.colorId);
    linkedColorsByProductSizeId.set(link.productSizeId, list);
  }

  const balances = await tx.inventoryBalance.findMany({
    where: {
      warehouseId,
      productSizeId: { in: productSizeIds },
    },
    select: { productSizeId: true, colorId: true, quantity: true },
  });

  const quantityByKey = new Map<string, number>();
  for (const balance of balances) {
    quantityByKey.set(
      `${balance.productSizeId}:${balance.colorId}`,
      balance.quantity,
    );
  }

  for (const productSizeId of productSizeIds) {
    const linkedColors = linkedColorsByProductSizeId.get(productSizeId) ?? [];
    if (linkedColors.length > 0) {
      const total = linkedColors.reduce(
        (sum, colorId) =>
          sum + (quantityByKey.get(`${productSizeId}:${colorId}`) ?? 0),
        0,
      );
      stockByProductSizeId.set(productSizeId, total);
      continue;
    }

    const masterQty = noColorId
      ? quantityByKey.get(`${productSizeId}:${noColorId}`) ?? 0
      : 0;
    stockByProductSizeId.set(productSizeId, masterQty);
  }

  return stockByProductSizeId;
}

export async function readMasterStockForProductSize(
  tx: StockLookupTx,
  warehouseId: string,
  productSizeId: string,
): Promise<number> {
  const stockByProductSizeId = await buildMasterStockByProductSizeId(
    tx,
    warehouseId,
    [productSizeId],
  );
  return stockByProductSizeId.get(productSizeId) ?? 0;
}

export async function readColorStock(
  tx: Pick<DatabaseService, 'inventoryBalance'>,
  warehouseId: string,
  productSizeId: string,
  colorId: string,
): Promise<number> {
  const balance = await tx.inventoryBalance.findFirst({
    where: { warehouseId, productSizeId, colorId },
    select: { quantity: true },
  });

  return balance?.quantity ?? 0;
}

export async function reconcileMasterStock(
  tx: InventoryTx,
  warehouseId: string,
  productSizeId: string,
  stock: number,
) {
  const colorCount = await tx.productSizeColor.count({
    where: { productSizeId },
  });
  if (colorCount > 0) return;

  const noColorId = await getOrCreateNoColorId(tx);
  const quantity = Math.max(0, Math.trunc(stock));

  await tx.inventoryBalance.upsert({
    where: {
      warehouseId_productSizeId_colorId: {
        warehouseId,
        productSizeId,
        colorId: noColorId,
      },
    },
    update: { quantity },
    create: {
      warehouseId,
      productSizeId,
      colorId: noColorId,
      quantity,
    },
  });
}
