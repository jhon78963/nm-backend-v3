import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_FOOTER_SLUG,
  type FooterCategoryItem,
  type FooterLinkItem,
  type PublicFooterConfig,
} from './constants/footer.defaults';
import { UpdateFooterDto } from './dto/update-footer.dto';
import { FooterCacheService } from './footer-cache.service';

export interface PublicFooterResponse {
  footer: PublicFooterConfig | null;
}

@Injectable()
export class FooterService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: FooterCacheService,
  ) {}

  async getPublicFooter(): Promise<PublicFooterResponse> {
    const cached = await this.cache.get<PublicFooterResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicFooterFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertFooter(dto: UpdateFooterDto): Promise<PublicFooterResponse> {
    const existing = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_FOOTER_SLUG },
    });

    const currentConfig = existing?.config
      ? this.normalizeConfig(existing.config as Partial<PublicFooterConfig>)
      : { ...DEFAULT_FOOTER_CONFIG };

    const nextConfig = this.mergeDtoIntoConfig(currentConfig, dto);

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_FOOTER_SLUG },
      create: {
        slug: DEFAULT_FOOTER_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicFooterResponse = { footer: nextConfig };
    await this.cache.set(response);
    return response;
  }

  private async buildPublicFooterFromDatabase(): Promise<PublicFooterResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_FOOTER_SLUG },
    });

    if (!row || !row.isActive) {
      return { footer: { ...DEFAULT_FOOTER_CONFIG } };
    }

    return {
      footer: this.normalizeConfig(row.config as Partial<PublicFooterConfig>),
    };
  }

  private mergeDtoIntoConfig(
    current: PublicFooterConfig,
    dto: UpdateFooterDto,
  ): PublicFooterConfig {
    return this.normalizeConfig({
      ...current,
      ...dto,
      categories: dto.categories
        ? this.normalizeCategories(dto.categories)
        : current.categories,
      usefulLinks: dto.usefulLinks
        ? this.normalizeLinks(dto.usefulLinks)
        : current.usefulLinks,
      helpCenterLinks: dto.helpCenterLinks
        ? this.normalizeLinks(dto.helpCenterLinks)
        : current.helpCenterLinks,
    });
  }

  private normalizeConfig(config: Partial<PublicFooterConfig>): PublicFooterConfig {
    return {
      newsletterTitle: config.newsletterTitle ?? DEFAULT_FOOTER_CONFIG.newsletterTitle,
      newsletterSubtitle: config.newsletterSubtitle ?? DEFAULT_FOOTER_CONFIG.newsletterSubtitle,
      aboutText: config.aboutText ?? DEFAULT_FOOTER_CONFIG.aboutText,
      address: config.address ?? DEFAULT_FOOTER_CONFIG.address,
      supportNumber: config.supportNumber ?? DEFAULT_FOOTER_CONFIG.supportNumber,
      supportEmail: config.supportEmail ?? DEFAULT_FOOTER_CONFIG.supportEmail,
      socialMediaEnabled: config.socialMediaEnabled ?? DEFAULT_FOOTER_CONFIG.socialMediaEnabled,
      facebookUrl: config.facebookUrl ?? DEFAULT_FOOTER_CONFIG.facebookUrl,
      twitterUrl: config.twitterUrl ?? DEFAULT_FOOTER_CONFIG.twitterUrl,
      instagramUrl: config.instagramUrl ?? DEFAULT_FOOTER_CONFIG.instagramUrl,
      pinterestUrl: config.pinterestUrl ?? DEFAULT_FOOTER_CONFIG.pinterestUrl,
      tiktokUrl: config.tiktokUrl ?? DEFAULT_FOOTER_CONFIG.tiktokUrl,
      categories: this.normalizeCategories(config.categories ?? DEFAULT_FOOTER_CONFIG.categories),
      usefulLinks: this.normalizeLinks(config.usefulLinks ?? DEFAULT_FOOTER_CONFIG.usefulLinks),
      helpCenterLinks: this.normalizeLinks(
        config.helpCenterLinks ?? DEFAULT_FOOTER_CONFIG.helpCenterLinks,
      ),
      copyrightEnabled: config.copyrightEnabled ?? DEFAULT_FOOTER_CONFIG.copyrightEnabled,
      copyrightContent: config.copyrightContent ?? DEFAULT_FOOTER_CONFIG.copyrightContent,
      paymentImageUrl: config.paymentImageUrl ?? DEFAULT_FOOTER_CONFIG.paymentImageUrl,
    };
  }

  private normalizeLinks(
    links: Array<Partial<FooterLinkItem>>,
  ): FooterLinkItem[] {
    return links
      .filter((link) => link.name && link.href)
      .map((link) => ({
        id: link.id ?? randomUUID(),
        name: link.name!,
        href: link.href!,
      }));
  }

  private normalizeCategories(
    categories: Array<Partial<FooterCategoryItem>>,
  ): FooterCategoryItem[] {
    return categories
      .filter((category) => category.name && category.href)
      .map((category) => ({
        id: category.id ?? randomUUID(),
        name: category.name!,
        href: category.href!,
      }));
  }
}
