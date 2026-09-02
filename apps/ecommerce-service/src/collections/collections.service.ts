import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';

import {
  DEFAULT_COLLECTIONS_CONFIG,
  DEFAULT_COLLECTIONS_SLUG,
  type HomeCollectionItem,
  type HomeCollectionsConfig,
  type PublicCollectionsResponse,
} from './constants/collections.defaults';
import { CollectionsCacheService } from './collections-cache.service';
import { UpdateCollectionsDto } from './dto/update-collections.dto';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CollectionsCacheService,
  ) {}

  async getPublicCollections(): Promise<PublicCollectionsResponse> {
    const cached = await this.cache.get<PublicCollectionsResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicCollectionsFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertCollections(dto: UpdateCollectionsDto): Promise<PublicCollectionsResponse> {
    const nextConfig = this.normalizeConfig({
      collections: dto.collections.map((collection) => this.normalizeCollection(collection)),
    });

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_COLLECTIONS_SLUG },
      create: {
        slug: DEFAULT_COLLECTIONS_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicCollectionsResponse = {
      collections: nextConfig.collections,
    };
    await this.cache.set(response);
    return response;
  }

  private async buildPublicCollectionsFromDatabase(): Promise<PublicCollectionsResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_COLLECTIONS_SLUG },
    });

    if (!row || !row.isActive) {
      return { collections: [...DEFAULT_COLLECTIONS_CONFIG.collections] };
    }

    const config = this.normalizeConfig(row.config as Partial<HomeCollectionsConfig>);
    return { collections: config.collections };
  }

  private normalizeConfig(config: Partial<HomeCollectionsConfig>): HomeCollectionsConfig {
    const collections = (config.collections ?? DEFAULT_COLLECTIONS_CONFIG.collections).map(
      (collection) => this.normalizeCollection(collection),
    );

    return { collections };
  }

  private normalizeCollection(
    collection: Partial<HomeCollectionItem>,
  ): HomeCollectionItem {
    return {
      id: collection.id ?? 'collection',
      tag: collection.tag,
      title: collection.title ?? 'Collection',
      description: collection.description,
      status: collection.status ?? true,
      productIds: collection.productIds ?? [],
    };
  }
}
