import { Module } from '@nestjs/common';

import { ServicesSectionCacheService } from './services-section-cache.service';
import { ServicesSectionController } from './services-section.controller';
import { ServicesSectionService } from './services-section.service';

@Module({
  controllers: [ServicesSectionController],
  providers: [ServicesSectionService, ServicesSectionCacheService],
  exports: [ServicesSectionService],
})
export class ServicesSectionModule {}
