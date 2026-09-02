import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';

import {
  DEFAULT_HOME_HERO_SLIDES,
  DEFAULT_HOME_HERO_SLUG,
} from './constants/hero-slide.defaults';
import { UpdateHeroSlidesDto } from './dto/update-hero-slides.dto';
import { HeroSlideCacheService } from './hero-slide-cache.service';

export interface PublicHeroSlideItem {
  id: string;
  imageUrl: string;
  href: string;
  alt: string;
  order: number;
}

export interface PublicHeroSlidesResponse {
  slides: PublicHeroSlideItem[];
}

@Injectable()
export class HeroSlideService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: HeroSlideCacheService,
  ) {}

  async getPublicHeroSlides(): Promise<PublicHeroSlidesResponse> {
    const cached = await this.cache.get<PublicHeroSlidesResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicHeroSlidesFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertHeroSlides(dto: UpdateHeroSlidesDto): Promise<PublicHeroSlidesResponse> {
    await this.db.$transaction(async (tx) => {
      const incomingIds = dto.slides
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));

      await tx.storeBanner.deleteMany({
        where: {
          slug: DEFAULT_HOME_HERO_SLUG,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      });

      for (const item of dto.slides) {
        if (item.id) {
          await tx.storeBanner.update({
            where: { id: item.id },
            data: {
              imageUrl: item.imageUrl,
              href: item.href,
              altText: item.alt ?? null,
              order: item.order,
              isActive: item.isActive ?? true,
            },
          });
        } else {
          await tx.storeBanner.create({
            data: {
              slug: DEFAULT_HOME_HERO_SLUG,
              imageUrl: item.imageUrl,
              href: item.href,
              altText: item.alt ?? null,
              order: item.order,
              isActive: item.isActive ?? true,
            },
          });
        }
      }
    });

    const response = await this.buildPublicHeroSlidesFromDatabase();
    await this.cache.set(response);
    return response;
  }

  private async buildPublicHeroSlidesFromDatabase(): Promise<PublicHeroSlidesResponse> {
    const rows = await this.db.storeBanner.findMany({
      where: { slug: DEFAULT_HOME_HERO_SLUG, isActive: true },
      orderBy: { order: 'asc' },
    });

    if (rows.length === 0) {
      return this.getDefaultPublicHeroSlides();
    }

    return {
      slides: rows.map((row) => ({
        id: row.id,
        imageUrl: row.imageUrl,
        href: row.href,
        alt: row.altText ?? 'Banner promocional',
        order: row.order,
      })),
    };
  }

  private getDefaultPublicHeroSlides(): PublicHeroSlidesResponse {
    return {
      slides: DEFAULT_HOME_HERO_SLIDES.map((item, index) => ({
        id: `default-${index}`,
        imageUrl: item.imageUrl,
        href: item.href,
        alt: item.alt,
        order: item.order,
      })),
    };
  }
}
