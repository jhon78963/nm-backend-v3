import { Module } from '@nestjs/common';

import { BannerCacheService } from './banner-cache.service';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';

@Module({
  controllers: [BannerController],
  providers: [BannerService, BannerCacheService],
  exports: [BannerService],
})
export class BannerModule {}
