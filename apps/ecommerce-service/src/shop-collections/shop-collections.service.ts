import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';

import {
  DEFAULT_SHOP_COLLECTIONS_CONFIG,
  DEFAULT_SHOP_COLLECTIONS_SLUG,
  type PublicShopCollectionsResponse,
  type ShopCollectionItem,
  type ShopCollectionsConfig,
} from './constants/shop-collections.defaults';
import {
  isVirtualSearchCollectionSlug,
  VIRTUAL_SEARCH_COLLECTION,
} from './constants/virtual-search-collection';
import { ShopCollectionsCacheService } from './shop-collections-cache.service';
import { UpdateShopCollectionsDto } from './dto/update-shop-collections.dto';

@Injectable()
export class ShopCollectionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: ShopCollectionsCacheService,
  ) {}

  async getPublicCollections(): Promise<PublicShopCollectionsResponse> {
    const cached = await this.cache.get<PublicShopCollectionsResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicCollectionsFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async getCollectionBySlug(slug: string): Promise<ShopCollectionItem | null> {
    if (isVirtualSearchCollectionSlug(slug)) {
      return { ...VIRTUAL_SEARCH_COLLECTION };
    }

    const { collections } = await this.getPublicCollections();
    return collections.find((collection) => collection.slug === slug) ?? null;
  }

  async getCollectionBySlugOrThrow(slug: string): Promise<ShopCollectionItem> {
    const collection = await this.getCollectionBySlug(slug);
    if (!collection || collection.status === false) {
      throw new NotFoundException(`Colección "${slug}" no encontrada.`);
    }

    return collection;
  }

  async getAdminCollections(): Promise<PublicShopCollectionsResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SHOP_COLLECTIONS_SLUG },
    });

    if (!row) {
      return { collections: [...DEFAULT_SHOP_COLLECTIONS_CONFIG.collections] };
    }

    const config = this.normalizeConfig(row.config as Partial<ShopCollectionsConfig>);
    return { collections: config.collections };
  }

  async upsertCollections(dto: UpdateShopCollectionsDto): Promise<PublicShopCollectionsResponse> {
    const nextConfig = this.normalizeConfig({
      collections: dto.collections.map((collection) => this.normalizeCollection(collection)),
    });

    this.assertUniqueSlugs(nextConfig.collections);

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_SHOP_COLLECTIONS_SLUG },
      create: {
        slug: DEFAULT_SHOP_COLLECTIONS_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicShopCollectionsResponse = {
      collections: nextConfig.collections,
    };

    await this.cache.set({
      collections: nextConfig.collections.filter((collection) => collection.status),
    });
    return response;
  }

  private async buildPublicCollectionsFromDatabase(): Promise<PublicShopCollectionsResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SHOP_COLLECTIONS_SLUG },
    });

    if (!row || !row.isActive) {
      return {
        collections: DEFAULT_SHOP_COLLECTIONS_CONFIG.collections.filter(
          (collection) => collection.status,
        ),
      };
    }

    const config = this.normalizeConfig(row.config as Partial<ShopCollectionsConfig>);
    return {
      collections: config.collections.filter((collection) => collection.status),
    };
  }

  private normalizeConfig(config: Partial<ShopCollectionsConfig>): ShopCollectionsConfig {
    const collections = (config.collections ?? DEFAULT_SHOP_COLLECTIONS_CONFIG.collections).map(
      (collection) => this.normalizeCollection(collection),
    );

    return { collections };
  }

  private normalizeCollection(
    collection: Partial<ShopCollectionItem>,
  ): ShopCollectionItem {
    const slug = collection.slug ?? collection.id ?? 'collection';

    return {
      id: collection.id ?? slug,
      slug,
      label: collection.label ?? 'Colección',
      description: collection.description,
      bannerImageUrl: collection.bannerImageUrl,
      status: collection.status ?? true,
      productIds: [...new Set(collection.productIds ?? [])],
    };
  }

  private assertUniqueSlugs(collections: ShopCollectionItem[]): void {
    const slugs = collections.map((collection) => collection.slug);
    const duplicates = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Slugs de colección duplicados: ${[...new Set(duplicates)].join(', ')}`,
      );
    }
  }
}
