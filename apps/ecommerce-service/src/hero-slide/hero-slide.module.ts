import { Module } from '@nestjs/common';

import { HeroSlideCacheService } from './hero-slide-cache.service';
import { HeroSlideController } from './hero-slide.controller';
import { HeroSlideService } from './hero-slide.service';

@Module({
  controllers: [HeroSlideController],
  providers: [HeroSlideService, HeroSlideCacheService],
  exports: [HeroSlideService],
})
export class HeroSlideModule {}
