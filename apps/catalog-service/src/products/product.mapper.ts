import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

function emptyToNull(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toPercentageDiscount(value?: string | number | null): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function toCashDiscount(value?: number | null): number | null {
  if (value == null) return null;
  return value;
}

function toOfferPrice(value?: number | null): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value;
}

export function mapProductInput(dto: CreateProductDto | UpdateProductDto) {
  const data: Record<string, unknown> = {};

  if (dto.name !== undefined) data.name = dto.name.trim();
  if (dto.description !== undefined) data.description = emptyToNull(dto.description);
  if (dto.shortDescription !== undefined) data.shortDescription = emptyToNull(dto.shortDescription);
  if (dto.additionalInfo !== undefined) data.additionalInfo = emptyToNull(dto.additionalInfo);
  if (dto.barcode !== undefined) data.barcode = emptyToNull(dto.barcode);
  if (dto.genderId !== undefined) data.genderId = dto.genderId;
  if (dto.vendorId !== undefined) data.vendorId = dto.vendorId ?? null;
  if (dto.warehouseId !== undefined) data.warehouseId = dto.warehouseId;
  if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
  if (dto.isOnSale !== undefined) data.isOnSale = dto.isOnSale;
  if (dto.isNew !== undefined) data.isNew = dto.isNew;
  if (dto.wooStatus !== undefined) data.wooStatus = dto.wooStatus;
  if (dto.status !== undefined) data.status = dto.status;
  if (dto.percentageDiscount !== undefined) {
    data.percentageDiscount = toPercentageDiscount(dto.percentageDiscount);
  }
  if (dto.cashDiscount !== undefined) {
    data.cashDiscount = toCashDiscount(dto.cashDiscount);
  }
  if (dto.offerPrice !== undefined) {
    data.offerPrice = toOfferPrice(dto.offerPrice);
  }

  return data;
}

export function mapProductCreateInput(dto: CreateProductDto) {
  return {
    name: dto.name.trim(),
    description: emptyToNull(dto.description),
    shortDescription: emptyToNull(dto.shortDescription),
    additionalInfo: emptyToNull(dto.additionalInfo),
    barcode: emptyToNull(dto.barcode),
    genderId: dto.genderId,
    vendorId: dto.vendorId ?? null,
    warehouseId: dto.warehouseId,
    isFeatured: dto.isFeatured ?? false,
    isOnSale: dto.isOnSale ?? false,
    isNew: dto.isNew ?? false,
    wooStatus: dto.wooStatus ?? 'draft',
    status: dto.status ?? 'active',
    percentageDiscount: toPercentageDiscount(dto.percentageDiscount),
    cashDiscount: toCashDiscount(dto.cashDiscount ?? null),
    offerPrice: toOfferPrice(dto.offerPrice ?? null),
  };
}
