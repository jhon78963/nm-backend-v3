import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  buildMasterStockByProductSizeId,
  buildStockByProductSizeColorId,
} from '@app/common/utils/product-inventory.util';

import {
  mapCatalogProductToPublicItem,
  type PublicProductItem,
} from '../ecommerce-products/ecommerce-products.mapper';
import { ProductReviewsService } from '../product-reviews/product-reviews.service';
import { ShopCollectionsService } from '../shop-collections/shop-collections.service';
import { isVirtualSearchCollectionSlug } from '../shop-collections/constants/virtual-search-collection';
import { ShopProductSortField, ShopProductsQueryDto } from './dto/shop-products-query.dto';

export interface ShopFacetSize {
  id: string;
  label: string;
}

export interface ShopFacetColor {
  id: string;
  label: string;
  hex?: string;
}

export interface ShopProductsFacets {
  sizes: ShopFacetSize[];
  colors: ShopFacetColor[];
}

export interface ShopProductsMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ShopProductsResponse {
  products: PublicProductItem[];
  meta: ShopProductsMeta;
  facets: ShopProductsFacets;
}

type CollectionProductRow = {
  id: string;
  name: string;
  createdAt: Date;
  description: string | null;
  shortDescription: string | null;
  additionalInfo: string | null;
  barcode: string | null;
  isOnSale: boolean;
  isFeatured: boolean;
  isNew: boolean;
  percentageDiscount: string | null;
  cashDiscount: number | null;
  offerPrice?: { toNumber?: () => number } | number | string | null;
  gender?: { name: string } | null;
  productSizes: Array<{
    id: string;
    salePrice: { toNumber?: () => number } | number | string;
    isDeleted: boolean;
    sizeId: string;
    size: { id: string; description: string; isDeleted: boolean };
    productSizeColors: Array<{
      colorId: string;
      color: { id: string; description: string; hash: string | null; isDeleted: boolean };
    }>;
  }>;
  media: Array<{ url: string; isCover: boolean; sortOrder: number }>;
};

@Injectable()
export class ShopProductsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly shopCollectionsService: ShopCollectionsService,
    private readonly productReviewsService: ProductReviewsService,
  ) {}

  async getShopProducts(query: ShopProductsQueryDto): Promise<ShopProductsResponse> {
    const collection = await this.shopCollectionsService.getCollectionBySlugOrThrow(
      query.collectionSlug,
    );

    const page = query.page ?? 1;
    const perPage = query.perPage ?? 12;
    const emptyResponse: ShopProductsResponse = {
      products: [],
      meta: { total: 0, page, perPage, totalPages: 0 },
      facets: { sizes: [], colors: [] },
    };

    const isSearchCollection = isVirtualSearchCollectionSlug(query.collectionSlug);

    if (!isSearchCollection && collection.productIds.length === 0) {
      return emptyResponse;
    }

    const products = isSearchCollection
      ? await this.loadWarehouseProducts(query.warehouseId)
      : await this.loadCollectionProducts(collection.productIds, query.warehouseId);

    const facets = this.buildFacets(products);
    const filtered = this.applyFilters(products, query);
    const sortOrderIds = isSearchCollection
      ? products.map((product) => product.id)
      : collection.productIds;
    const sorted = this.sortProducts(
      filtered,
      query.sort ?? ShopProductSortField.FEATURED,
      sortOrderIds,
    );
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const paginated = sorted.slice((page - 1) * perPage, page * perPage);

    const productSizeIds = paginated.flatMap((product) =>
      product.productSizes.map((size) => size.id),
    );
    const paginatedProductIds = paginated.map((product) => product.id);
    const [stockByProductSizeId, stockByProductSizeColorId, reviewStatsByProductId] =
      await Promise.all([
        buildMasterStockByProductSizeId(this.db, query.warehouseId, productSizeIds),
        buildStockByProductSizeColorId(this.db, query.warehouseId, productSizeIds),
        this.productReviewsService.getReviewStatsForProducts(paginatedProductIds),
      ]);

    return {
      products: paginated.map((product) =>
        mapCatalogProductToPublicItem(
          product,
          stockByProductSizeId,
          stockByProductSizeColorId,
          reviewStatsByProductId.get(product.id),
        ),
      ),
      meta: { total, page, perPage, totalPages },
      facets,
    };
  }

  private async loadWarehouseProducts(warehouseId: string): Promise<CollectionProductRow[]> {
    return this.db.product.findMany({
      where: {
        warehouseId,
        isDeleted: false,
        status: { in: ['active', 'AVAILABLE'] },
        wooStatus: { in: ['publish', 'draft'] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
        additionalInfo: true,
        barcode: true,
        isOnSale: true,
        isFeatured: true,
        isNew: true,
        percentageDiscount: true,
        cashDiscount: true,
        offerPrice: true,
        createdAt: true,
        gender: { select: { name: true } },
        productSizes: {
          where: { isDeleted: false },
          select: {
            id: true,
            salePrice: true,
            isDeleted: true,
            sizeId: true,
            size: {
              select: { id: true, description: true, isDeleted: true },
            },
            productSizeColors: {
              select: {
                colorId: true,
                color: {
                  select: { id: true, description: true, hash: true, isDeleted: true },
                },
              },
            },
          },
        },
        media: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { url: true, isCover: true, sortOrder: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private async loadCollectionProducts(
    productIds: string[],
    warehouseId: string,
  ): Promise<CollectionProductRow[]> {
    const products = await this.db.product.findMany({
      where: {
        id: { in: productIds },
        warehouseId,
        isDeleted: false,
        status: { in: ['active', 'AVAILABLE'] },
        wooStatus: { in: ['publish', 'draft'] },
      },
      select: {
        id: true,
        name: true,
        description: true,
        shortDescription: true,
        additionalInfo: true,
        barcode: true,
        isOnSale: true,
        isFeatured: true,
        isNew: true,
        percentageDiscount: true,
        cashDiscount: true,
        offerPrice: true,
        createdAt: true,
        gender: { select: { name: true } },
        productSizes: {
          where: { isDeleted: false },
          select: {
            id: true,
            salePrice: true,
            isDeleted: true,
            sizeId: true,
            size: {
              select: { id: true, description: true, isDeleted: true },
            },
            productSizeColors: {
              select: {
                colorId: true,
                color: {
                  select: { id: true, description: true, hash: true, isDeleted: true },
                },
              },
            },
          },
        },
        media: {
          orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { url: true, isCover: true, sortOrder: true },
        },
      },
    });

    const order = new Map(productIds.map((id, index) => [id, index]));
    return products.sort(
      (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  private buildFacets(products: CollectionProductRow[]): ShopProductsFacets {
    const sizes = new Map<string, ShopFacetSize>();
    const colors = new Map<string, ShopFacetColor>();

    for (const product of products) {
      for (const productSize of product.productSizes) {
        if (productSize.isDeleted || productSize.size.isDeleted) continue;

        sizes.set(productSize.size.id, {
          id: productSize.size.id,
          label: productSize.size.description,
        });

        for (const productSizeColor of productSize.productSizeColors) {
          if (productSizeColor.color.isDeleted) continue;

          colors.set(productSizeColor.color.id, {
            id: productSizeColor.color.id,
            label: productSizeColor.color.description,
            hex: productSizeColor.color.hash ?? undefined,
          });
        }
      }
    }

    return {
      sizes: [...sizes.values()].sort((a, b) => a.label.localeCompare(b.label)),
      colors: [...colors.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }

  private applyFilters(
    products: CollectionProductRow[],
    query: ShopProductsQueryDto,
  ): CollectionProductRow[] {
    const sizeIds = this.parseCsv(query.sizeIds);
    const colorIds = this.parseCsv(query.colorIds);

    return products.filter((product) => {
      const activeSizes = product.productSizes.filter((size) => !size.isDeleted);

      if (sizeIds.length > 0) {
        const hasSize = activeSizes.some((size) => sizeIds.includes(size.sizeId));
        if (!hasSize) return false;
      }

      if (colorIds.length > 0) {
        const hasColor = activeSizes.some((size) =>
          size.productSizeColors.some(
            (psc) => !psc.color.isDeleted && colorIds.includes(psc.colorId),
          ),
        );
        if (!hasColor) return false;
      }

      const minSalePrice = this.getEffectiveMinPrice(product);
      if (query.minPrice !== undefined && minSalePrice < query.minPrice) {
        return false;
      }

      if (query.maxPrice !== undefined && minSalePrice > query.maxPrice) {
        return false;
      }

      if (query.onSale && !this.isProductOnSale(product)) {
        return false;
      }

      if (query.q?.trim() && !this.matchesSearchQuery(product, query.q)) {
        return false;
      }

      return true;
    });
  }

  private matchesSearchQuery(product: CollectionProductRow, rawQuery: string): boolean {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      product.name,
      product.barcode ?? '',
      product.shortDescription ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  }

  private isProductOnSale(product: CollectionProductRow): boolean {
    if (product.isOnSale) return true;

    const offerPrice = product.offerPrice != null ? this.toNumber(product.offerPrice) : 0;
    if (offerPrice > 0) return true;

    const percentage = product.percentageDiscount
      ? Number(product.percentageDiscount)
      : 0;
    if (Number.isFinite(percentage) && percentage > 0) return true;

    const cashDiscount = product.cashDiscount != null ? Number(product.cashDiscount) : 0;
    if (Number.isFinite(cashDiscount) && cashDiscount > 0) return true;

    return false;
  }

  private sortProducts(
    products: CollectionProductRow[],
    sort: ShopProductSortField,
    productIds: string[],
  ): CollectionProductRow[] {
    const order = new Map(productIds.map((id, index) => [id, index]));

    if (sort === ShopProductSortField.FEATURED) {
      return [...products].sort(
        (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
      );
    }

    if (sort === ShopProductSortField.NEWEST) {
      return [...products].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    }

    if (sort === ShopProductSortField.PRICE_ASC) {
      return [...products].sort(
        (a, b) => this.getEffectiveMinPrice(a) - this.getEffectiveMinPrice(b),
      );
    }

    return [...products].sort(
      (a, b) => this.getEffectiveMinPrice(b) - this.getEffectiveMinPrice(a),
    );
  }

  private getEffectiveMinPrice(product: CollectionProductRow): number {
    const offerPrice = product.offerPrice != null ? this.toNumber(product.offerPrice) : 0;
    if (offerPrice > 0) {
      return offerPrice;
    }

    return this.getMinSalePrice(product.productSizes);
  }

  private getMinSalePrice(
    sizes: CollectionProductRow['productSizes'],
  ): number {
    const prices = sizes
      .filter((size) => !size.isDeleted)
      .map((size) => this.toNumber(size.salePrice))
      .filter((price) => price > 0);

    return prices.length > 0 ? Math.min(...prices) : 0;
  }

  private toNumber(value: CollectionProductRow['productSizes'][number]['salePrice']): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    return 0;
  }

  private parseCsv(value?: string): string[] {
    if (!value) return [];
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  }
}
