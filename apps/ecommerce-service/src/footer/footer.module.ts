import { Module } from '@nestjs/common';

import { FooterCacheService } from './footer-cache.service';
import { FooterController } from './footer.controller';
import { FooterService } from './footer.service';

@Module({
  controllers: [FooterController],
  providers: [FooterService, FooterCacheService],
  exports: [FooterService],
})
export class FooterModule {}
