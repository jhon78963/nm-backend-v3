import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';

import { CategoryProductsCacheService } from './category-products-cache.service';
import {
  DEFAULT_CATEGORY_PRODUCTS_CONFIG,
  DEFAULT_CATEGORY_PRODUCTS_SLUG,
  type HomeCategoryProductSectionConfig,
  type HomeCategoryProductTabConfigItem,
  type PublicCategoryProductSectionResponse,
} from './constants/category-products.defaults';
import { UpdateCategoryProductsDto } from './dto/update-category-products.dto';

@Injectable()
export class CategoryProductsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CategoryProductsCacheService,
  ) {}

  async getPublicCategoryProducts(): Promise<PublicCategoryProductSectionResponse> {
    const cached = await this.cache.get<PublicCategoryProductSectionResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicCategoryProductsFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertCategoryProducts(
    dto: UpdateCategoryProductsDto,
  ): Promise<PublicCategoryProductSectionResponse> {
    const existing = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_CATEGORY_PRODUCTS_SLUG },
    });

    const currentConfig = existing?.config
      ? this.normalizeConfig(existing.config as Partial<HomeCategoryProductSectionConfig>)
      : { ...DEFAULT_CATEGORY_PRODUCTS_CONFIG };

    const nextConfig = this.mergeDtoIntoConfig(currentConfig, dto);

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_CATEGORY_PRODUCTS_SLUG },
      create: {
        slug: DEFAULT_CATEGORY_PRODUCTS_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicCategoryProductSectionResponse = { section: nextConfig };
    await this.cache.set(response);
    return response;
  }

  private async buildPublicCategoryProductsFromDatabase(): Promise<PublicCategoryProductSectionResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_CATEGORY_PRODUCTS_SLUG },
    });

    if (!row || !row.isActive) {
      return { section: { ...DEFAULT_CATEGORY_PRODUCTS_CONFIG } };
    }

    return {
      section: this.normalizeConfig(row.config as Partial<HomeCategoryProductSectionConfig>),
    };
  }

  private mergeDtoIntoConfig(
    current: HomeCategoryProductSectionConfig,
    dto: UpdateCategoryProductsDto,
  ): HomeCategoryProductSectionConfig {
    return this.normalizeConfig({
      status: dto.status ?? current.status,
      leftPanel: dto.leftPanel
        ? {
            title: dto.leftPanel.title,
            status: dto.leftPanel.status ?? true,
            productIds: dto.leftPanel.productIds ?? [],
          }
        : current.leftPanel,
      rightPanel: {
        productCategory: {
          title: dto.rightPanel.productCategory.title,
          status: dto.rightPanel.productCategory.status ?? true,
          tabs: dto.rightPanel.productCategory.tabs
            ? dto.rightPanel.productCategory.tabs.map((tab) => this.normalizeTab(tab))
            : current.rightPanel.productCategory.tabs,
        },
        productBanner: dto.rightPanel.productBanner
          ? {
              status: dto.rightPanel.productBanner.status ?? true,
              imageUrl:
                dto.rightPanel.productBanner.imageUrl
                ?? current.rightPanel.productBanner?.imageUrl
                ?? '',
              href:
                dto.rightPanel.productBanner.href
                ?? current.rightPanel.productBanner?.href
                ?? '/',
              alt: dto.rightPanel.productBanner.alt ?? current.rightPanel.productBanner?.alt,
            }
          : current.rightPanel.productBanner,
      },
    });
  }

  private normalizeConfig(
    config: Partial<HomeCategoryProductSectionConfig>,
  ): HomeCategoryProductSectionConfig {
    const defaults = DEFAULT_CATEGORY_PRODUCTS_CONFIG;

    return {
      status: config.status ?? defaults.status,
      leftPanel: config.leftPanel
        ? {
            title: config.leftPanel.title ?? defaults.leftPanel!.title,
            status: config.leftPanel.status ?? true,
            productIds: config.leftPanel.productIds ?? [],
          }
        : defaults.leftPanel,
      rightPanel: {
        productCategory: {
          title:
            config.rightPanel?.productCategory?.title
            ?? defaults.rightPanel.productCategory.title,
          status: config.rightPanel?.productCategory?.status ?? true,
          tabs: (config.rightPanel?.productCategory?.tabs ?? []).map((tab) =>
            this.normalizeTab(tab),
          ),
        },
        productBanner: config.rightPanel?.productBanner
          ? {
              status: config.rightPanel.productBanner.status ?? true,
              imageUrl: config.rightPanel.productBanner.imageUrl,
              href: config.rightPanel.productBanner.href,
              alt: config.rightPanel.productBanner.alt,
            }
          : defaults.rightPanel.productBanner,
      },
    };
  }

  private normalizeTab(
    tab: Partial<HomeCategoryProductTabConfigItem>,
  ): HomeCategoryProductTabConfigItem {
    return {
      id: tab.id ?? 'tab',
      name: tab.name ?? 'Tab',
      slug: tab.slug,
      productIds: tab.productIds ?? [],
    };
  }
}
