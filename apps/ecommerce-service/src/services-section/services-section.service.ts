import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import {
  DEFAULT_SERVICES_CONFIG,
  DEFAULT_SERVICES_SLUG,
  type HomeServiceItemConfig,
  type HomeServicesConfig,
} from './constants/services-section.defaults';
import { UpdateServicesDto } from './dto/update-services.dto';
import { ServicesSectionCacheService } from './services-section-cache.service';

export interface PublicHomeServicesResponse {
  services: HomeServicesConfig | null;
}

@Injectable()
export class ServicesSectionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: ServicesSectionCacheService,
  ) {}

  async getPublicServices(): Promise<PublicHomeServicesResponse> {
    const cached = await this.cache.get<PublicHomeServicesResponse>();
    if (cached) {
      return cached;
    }

    const response = await this.buildPublicServicesFromDatabase();
    await this.cache.set(response);
    return response;
  }

  async upsertServices(dto: UpdateServicesDto): Promise<PublicHomeServicesResponse> {
    const existing = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SERVICES_SLUG },
    });

    const currentConfig = existing?.config
      ? this.normalizeConfig(existing.config as Partial<HomeServicesConfig>)
      : { ...DEFAULT_SERVICES_CONFIG };

    const nextConfig = this.mergeDtoIntoConfig(currentConfig, dto);

    await this.db.storeSection.upsert({
      where: { slug: DEFAULT_SERVICES_SLUG },
      create: {
        slug: DEFAULT_SERVICES_SLUG,
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        config: nextConfig as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    const response: PublicHomeServicesResponse = { services: nextConfig };
    await this.cache.set(response);
    return response;
  }

  private async buildPublicServicesFromDatabase(): Promise<PublicHomeServicesResponse> {
    const row = await this.db.storeSection.findUnique({
      where: { slug: DEFAULT_SERVICES_SLUG },
    });

    if (!row || !row.isActive) {
      return { services: { ...DEFAULT_SERVICES_CONFIG } };
    }

    return {
      services: this.normalizeConfig(row.config as Partial<HomeServicesConfig>),
    };
  }

  private mergeDtoIntoConfig(
    current: HomeServicesConfig,
    dto: UpdateServicesDto,
  ): HomeServicesConfig {
    return this.normalizeConfig({
      status: dto.status ?? current.status,
      services: dto.services ? this.normalizeServices(dto.services) : current.services,
    });
  }

  private normalizeConfig(config: Partial<HomeServicesConfig>): HomeServicesConfig {
    return {
      status: config.status ?? DEFAULT_SERVICES_CONFIG.status,
      services: this.normalizeServices(config.services ?? DEFAULT_SERVICES_CONFIG.services),
    };
  }

  private normalizeServices(
    services: Array<Partial<HomeServiceItemConfig>>,
  ): HomeServiceItemConfig[] {
    return services
      .filter((service) => service.title && service.imageUrl)
      .map((service, index) => ({
        id: service.id ?? randomUUID(),
        imageUrl: service.imageUrl!,
        title: service.title!,
        description: service.description ?? '',
        status: service.status ?? true,
        order: service.order ?? index,
      }))
      .sort((a, b) => a.order - b.order);
  }
}
