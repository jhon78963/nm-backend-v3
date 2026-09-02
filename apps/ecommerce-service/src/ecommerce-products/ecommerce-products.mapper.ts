export const PLACEHOLDER_PRODUCT_IMAGE_URL = '/placeholder-product.svg';

export interface PublicProductItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  galleryImageUrls: string[];
  price: number;
  salePrice: number;
  discount: number;
  stockStatus: 'in_stock' | 'out_of_stock';
  ratingCount: null;
  reviewsCount: number;
}

export interface PublicProductsResponse {
  products: PublicProductItem[];
}

type ProductSizeWithStock = {
  id: string;
  salePrice: { toNumber?: () => number } | number | string;
  isDeleted: boolean;
};

type ProductMediaRow = {
  url: string;
  isCover: boolean;
  sortOrder: number;
};

export type PublicCatalogProduct = {
  id: string;
  name: string;
  barcode: string | null;
  isOnSale: boolean;
  productSizes: ProductSizeWithStock[];
  media: ProductMediaRow[];
};

export function mapCatalogProductToPublicItem(
  product: PublicCatalogProduct,
  stockByProductSizeId: Map<string, number>,
): PublicProductItem {
  const activeSizes = product.productSizes.filter((size) => !size.isDeleted);
  const salePrices = activeSizes
    .map((size) => toNumber(size.salePrice))
    .filter((price) => price > 0);

  const price = salePrices.length > 0 ? Math.max(...salePrices) : 0;
  const salePrice = salePrices.length > 0 ? Math.min(...salePrices) : 0;
  const discount =
    product.isOnSale && price > salePrice
      ? Math.round(((price - salePrice) / price) * 100)
      : 0;

  const galleryImageUrls = product.media
    .slice()
    .sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder)
    .map((item) => item.url)
    .filter(Boolean);

  const imageUrl = galleryImageUrls[0] ?? PLACEHOLDER_PRODUCT_IMAGE_URL;

  const hasStock = activeSizes.some(
    (size) => (stockByProductSizeId.get(size.id) ?? 0) > 0,
  );

  return {
    id: product.id,
    name: product.name,
    slug: product.barcode?.trim() || product.id,
    imageUrl,
    galleryImageUrls: galleryImageUrls.length > 0 ? galleryImageUrls : [imageUrl],
    price,
    salePrice,
    discount,
    stockStatus: hasStock ? 'in_stock' : 'out_of_stock',
    ratingCount: null,
    reviewsCount: 0,
  };
}

function toNumber(value: ProductSizeWithStock['salePrice']): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }

  return 0;
}
