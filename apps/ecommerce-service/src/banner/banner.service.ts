import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';

import { BannerCacheService } from './banner-cache.service';
import {
  DEFAULT_HOME_BANNERS,
  DEFAULT_HOME_OFFER_BANNER,
  DEFAULT_HOME_OFFER_BANNER_SLUG,
  DEFAULT_OFFER_BANNER_CACHE_KEY,
  DEFAULT_STORE_BANNER_SLUG,
} from './constants/banner.defaults';
import { UpdateBannersDto } from './dto/update-banners.dto';
import { UpdateOfferBannerDto } from './dto/update-offer-banner.dto';

export interface PublicBannerItem {
  id: string;
  imageUrl: string;
  href: string;
  order: number;
}

export interface PublicBannersResponse {
  banners: PublicBannerItem[];
}

export interface PublicOfferBannerItem {
  id: string;
  imageUrl: string;
  href: string;
  alt?: string;
  status: boolean;
}

export interface PublicOfferBannerResponse {
  banner: PublicOfferBannerItem | null;
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

  async getPublicOfferBanner(): Promise<PublicOfferBannerResponse> {
    const cached = await this.cache.get<PublicOfferBannerResponse>(
      DEFAULT_OFFER_BANNER_CACHE_KEY,
    );
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicOfferBannerFromDatabase();
    await this.cache.set(response, DEFAULT_OFFER_BANNER_CACHE_KEY);
    return response;
  }

  async upsertOfferBanner(dto: UpdateOfferBannerDto): Promise<PublicOfferBannerResponse> {
    const existing = await this.db.storeBanner.findFirst({
      where: { slug: DEFAULT_HOME_OFFER_BANNER_SLUG },
      orderBy: { order: 'asc' },
    });

    if (existing) {
      await this.db.storeBanner.update({
        where: { id: existing.id },
        data: {
          imageUrl: dto.imageUrl,
          href: dto.href,
          altText: dto.altText,
          isActive: dto.isActive ?? true,
        },
      });
    } else {
      await this.db.storeBanner.create({
        data: {
          slug: DEFAULT_HOME_OFFER_BANNER_SLUG,
          imageUrl: dto.imageUrl,
          href: dto.href,
          altText: dto.altText,
          order: 0,
          isActive: dto.isActive ?? true,
        },
      });
    }

    const response = await this.buildPublicOfferBannerFromDatabase();
    await this.cache.set(response, DEFAULT_OFFER_BANNER_CACHE_KEY);
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

  private async buildPublicOfferBannerFromDatabase(): Promise<PublicOfferBannerResponse> {
    const row = await this.db.storeBanner.findFirst({
      where: { slug: DEFAULT_HOME_OFFER_BANNER_SLUG },
      orderBy: { order: 'asc' },
    });

    if (!row) {
      return this.getDefaultPublicOfferBanner();
    }

    if (!row.isActive) {
      return { banner: null };
    }

    return {
      banner: {
        id: row.id,
        imageUrl: row.imageUrl,
        href: row.href,
        alt: row.altText ?? undefined,
        status: row.isActive,
      },
    };
  }

  private getDefaultPublicOfferBanner(): PublicOfferBannerResponse {
    return {
      banner: {
        id: 'default-offer-banner',
        imageUrl: DEFAULT_HOME_OFFER_BANNER.imageUrl,
        href: DEFAULT_HOME_OFFER_BANNER.href,
        alt: 'Banner promocional del home',
        status: true,
      },
    };
  }
}
