import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';

import { BannerCacheService } from './banner-cache.service';
import {
  DEFAULT_HOME_BANNERS,
  DEFAULT_STORE_BANNER_SLUG,
} from './constants/banner.defaults';
import { UpdateBannersDto } from './dto/update-banners.dto';

export interface PublicBannerItem {
  id: string;
  imageUrl: string;
  href: string;
  order: number;
}

export interface PublicBannersResponse {
  banners: PublicBannerItem[];
}

@Injectable()
export class BannerService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: BannerCacheService,
  ) {}

  async getPublicBanners(): Promise<PublicBannersResponse> {
    const cached = await this.cache.get<PublicBannersResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicBannersFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertBanners(dto: UpdateBannersDto): Promise<PublicBannersResponse> {
    await this.db.$transaction(async (tx) => {
      const incomingIds = dto.banners
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));

      await tx.storeBanner.deleteMany({
        where: {
          slug: DEFAULT_STORE_BANNER_SLUG,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      });

      for (const item of dto.banners) {
        if (item.id) {
          await tx.storeBanner.update({
            where: { id: item.id },
            data: {
              imageUrl: item.imageUrl,
              href: item.href,
              order: item.order,
              isActive: item.isActive ?? true,
            },
          });
        } else {
          await tx.storeBanner.create({
            data: {
              slug: DEFAULT_STORE_BANNER_SLUG,
              imageUrl: item.imageUrl,
              href: item.href,
              order: item.order,
              isActive: item.isActive ?? true,
            },
          });
        }
      }
    });

    const response = await this.buildPublicBannersFromDatabase();
    await this.cache.set(response);
    return response;
  }

  private async buildPublicBannersFromDatabase(): Promise<PublicBannersResponse> {
    const rows = await this.db.storeBanner.findMany({
      where: { slug: DEFAULT_STORE_BANNER_SLUG, isActive: true },
      orderBy: { order: 'asc' },
    });

    if (rows.length === 0) {
      return this.getDefaultPublicBanners();
    }

    return {
      banners: rows.map((row) => ({
        id: row.id,
        imageUrl: row.imageUrl,
        href: row.href,
        order: row.order,
      })),
    };
  }

  private getDefaultPublicBanners(): PublicBannersResponse {
    return {
      banners: DEFAULT_HOME_BANNERS.map((item, index) => ({
        id: `default-${index}`,
        imageUrl: item.imageUrl,
        href: item.href,
        order: item.order,
      })),
    };
  }
}
