import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import {
  buildMasterStockByProductSizeId,
  buildStockByProductSizeColorId,
} from '@app/common/utils/product-inventory.util';

import {
  mapCatalogProductToPublicItem,
  type PublicCatalogProduct,
  type PublicProductItem,
} from '../ecommerce-products/ecommerce-products.mapper';
import { ProductReviewsService } from '../product-reviews/product-reviews.service';
import { ShopCollectionsService } from '../shop-collections/shop-collections.service';
import { StoreSearchQueryDto } from './dto/store-search-query.dto';

export interface StoreSearchCollectionItem {
  id: string;
  slug: string;
  label: string;
}

export interface StoreSearchResponse {
  query: string;
  collections: StoreSearchCollectionItem[];
  products: PublicProductItem[];
}

@Injectable()
export class StoreSearchService {
  constructor(
    private readonly db: DatabaseService,
    private readonly shopCollectionsService: ShopCollectionsService,
    private readonly productReviewsService: ProductReviewsService,
  ) {}

  async search(query: StoreSearchQueryDto): Promise<StoreSearchResponse> {
    const perPage = query.perPage ?? 4;
    const search = query.q?.trim() ?? '';

    const [collections, products] = await Promise.all([
      this.getMatchingCollections(search, 4),
      this.searchProducts(search, query.warehouseId, perPage),
    ]);

    return {
      query: search,
      collections,
      products,
    };
  }

  private async getMatchingCollections(
    search: string,
    limit: number,
  ): Promise<StoreSearchCollectionItem[]> {
    const { collections } = await this.shopCollectionsService.getPublicCollections();
    const active = collections.filter((collection) => collection.status !== false);

    const filtered = search
      ? active.filter((collection) => {
          const normalized = search.toLowerCase();
          return (
            collection.label.toLowerCase().includes(normalized)
            || collection.slug.toLowerCase().includes(normalized)
            || collection.description?.toLowerCase().includes(normalized)
          );
        })
      : active;

    return filtered.slice(0, limit).map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      label: collection.label,
    }));
  }

  private async searchProducts(
    search: string,
    warehouseId: string,
    perPage: number,
  ): Promise<PublicProductItem[]> {
    const products = await this.db.product.findMany({
      where: {
        warehouseId,
        isDeleted: false,
        status: { in: ['active', 'AVAILABLE'] },
        wooStatus: { in: ['publish', 'draft'] },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { barcode: { contains: search } },
                { shortDescription: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        gender: { select: { name: true } },
        productSizes: {
          where: { isDeleted: false },
          select: {
            id: true,
            salePrice: true,
            isDeleted: true,
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
          select: {
            url: true,
            isCover: true,
            sortOrder: true,
          },
        },
      },
      orderBy: search
        ? [{ isFeatured: 'desc' }, { name: 'asc' }]
        : [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: perPage,
    });

    if (products.length === 0) {
      return [];
    }

    const productIds = products.map((product) => product.id);
    const productSizeIds = products.flatMap((product) =>
      product.productSizes.map((size) => size.id),
    );

    const [stockByProductSizeId, stockByProductSizeColorId, reviewStatsByProductId] =
      await Promise.all([
        buildMasterStockByProductSizeId(this.db, warehouseId, productSizeIds),
        buildStockByProductSizeColorId(this.db, warehouseId, productSizeIds),
        this.productReviewsService.getReviewStatsForProducts(productIds),
      ]);

    return products.map((product) =>
      mapCatalogProductToPublicItem(
        product as PublicCatalogProduct,
        stockByProductSizeId,
        stockByProductSizeColorId,
        reviewStatsByProductId.get(product.id),
      ),
    );
  }
}
