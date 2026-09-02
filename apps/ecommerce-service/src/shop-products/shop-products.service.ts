import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { buildMasterStockByProductSizeId } from '@app/common/utils/product-inventory.util';

import {
  mapCatalogProductToPublicItem,
  type PublicProductItem,
} from '../ecommerce-products/ecommerce-products.mapper';
import { ShopCollectionsService } from '../shop-collections/shop-collections.service';
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
  createdAt: Date;
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
  isOnSale: boolean;
  name: string;
  barcode: string | null;
};

@Injectable()
export class ShopProductsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly shopCollectionsService: ShopCollectionsService,
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

    if (collection.productIds.length === 0) {
      return emptyResponse;
    }

    const products = await this.loadCollectionProducts(
      collection.productIds,
      query.warehouseId,
    );

    const facets = this.buildFacets(products);
    const filtered = this.applyFilters(products, query);
    const sorted = this.sortProducts(filtered, query.sort ?? ShopProductSortField.FEATURED, collection.productIds);
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const paginated = sorted.slice((page - 1) * perPage, page * perPage);

    const stockByProductSizeId = await buildMasterStockByProductSizeId(
      this.db,
      query.warehouseId,
      paginated.flatMap((product) => product.productSizes.map((size) => size.id)),
    );

    return {
      products: paginated.map((product) =>
        mapCatalogProductToPublicItem(product, stockByProductSizeId),
      ),
      meta: { total, page, perPage, totalPages },
      facets,
    };
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
        barcode: true,
        isOnSale: true,
        createdAt: true,
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

      const minSalePrice = this.getMinSalePrice(activeSizes);
      if (query.minPrice !== undefined && minSalePrice < query.minPrice) {
        return false;
      }

      if (query.maxPrice !== undefined && minSalePrice > query.maxPrice) {
        return false;
      }

      return true;
    });
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
        (a, b) =>
          this.getMinSalePrice(a.productSizes) - this.getMinSalePrice(b.productSizes),
      );
    }

    return [...products].sort(
      (a, b) =>
        this.getMinSalePrice(b.productSizes) - this.getMinSalePrice(a.productSizes),
    );
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
