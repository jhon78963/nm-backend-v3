import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import {
  DEFAULT_SOCIAL_MEDIA_CONFIG,
  DEFAULT_SOCIAL_MEDIA_SLUG,
  type HomeSocialMediaConfig,
  type SocialMediaBannerConfig,
} from './constants/social-media.defaults';
import { UpdateSocialMediaDto } from './dto/update-social-media.dto';
import { SocialMediaCacheService } from './social-media-cache.service';

export interface PublicHomeSocialMediaResponse {
  socialMedia: HomeSocialMediaConfig | null;
}

@Injectable()
export class SocialMediaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: SocialMediaCacheService,
  ) {}

  async getPublicSocialMedia(): Promise<PublicHomeSocialMediaResponse> {
    const cached = await this.cache.get<PublicHomeSocialMediaResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicSocialMediaFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertSocialMedia(dto: UpdateSocialMediaDto): Promise<PublicHomeSocialMediaResponse> {
    const existing = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SOCIAL_MEDIA_SLUG },
    });

    const currentConfig = existing?.config
      ? this.normalizeConfig(existing.config as Partial<HomeSocialMediaConfig>)
      : { ...DEFAULT_SOCIAL_MEDIA_CONFIG };

    const nextConfig = this.mergeDtoIntoConfig(currentConfig, dto);

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_SOCIAL_MEDIA_SLUG },
      create: {
        slug: DEFAULT_SOCIAL_MEDIA_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicHomeSocialMediaResponse = { socialMedia: nextConfig };
    await this.cache.set(response);
    return response;
  }

  private async buildPublicSocialMediaFromDatabase(): Promise<PublicHomeSocialMediaResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SOCIAL_MEDIA_SLUG },
    });

    if (!row || !row.isActive) {
      return { socialMedia: { ...DEFAULT_SOCIAL_MEDIA_CONFIG } };
    }

    return {
      socialMedia: this.normalizeConfig(row.config as Partial<HomeSocialMediaConfig>),
    };
  }

  private mergeDtoIntoConfig(
    current: HomeSocialMediaConfig,
    dto: UpdateSocialMediaDto,
  ): HomeSocialMediaConfig {
    return this.normalizeConfig({
      status: dto.status ?? current.status,
      title: dto.title ?? current.title,
      platform: dto.platform ?? current.platform,
      profileUrl: dto.profileUrl ?? current.profileUrl,
      banners: dto.banners ? this.normalizeBanners(dto.banners) : current.banners,
    });
  }

  private normalizeConfig(config: Partial<HomeSocialMediaConfig>): HomeSocialMediaConfig {
    return {
      status: config.status ?? DEFAULT_SOCIAL_MEDIA_CONFIG.status,
      title: config.title ?? DEFAULT_SOCIAL_MEDIA_CONFIG.title,
      platform: config.platform ?? DEFAULT_SOCIAL_MEDIA_CONFIG.platform,
      profileUrl: config.profileUrl ?? DEFAULT_SOCIAL_MEDIA_CONFIG.profileUrl,
      banners: this.normalizeBanners(config.banners ?? DEFAULT_SOCIAL_MEDIA_CONFIG.banners),
    };
  }

  private normalizeBanners(
    banners: Array<Partial<SocialMediaBannerConfig>>,
  ): SocialMediaBannerConfig[] {
    return banners
      .filter((banner) => banner.imageUrl)
      .map((banner, index) => ({
        id: banner.id ?? randomUUID(),
        imageUrl: banner.imageUrl!,
        href: banner.href ?? DEFAULT_SOCIAL_MEDIA_CONFIG.profileUrl ?? '#',
        status: banner.status ?? true,
        order: banner.order ?? index,
      }))
      .sort((a, b) => a.order - b.order);
  }
}
