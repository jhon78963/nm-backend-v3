import { Module } from '@nestjs/common';

import { SocialMediaCacheService } from './social-media-cache.service';
import { SocialMediaController } from './social-media.controller';
import { SocialMediaService } from './social-media.service';

@Module({
  controllers: [SocialMediaController],
  providers: [SocialMediaService, SocialMediaCacheService],
  exports: [SocialMediaService],
})
export class SocialMediaModule {}
