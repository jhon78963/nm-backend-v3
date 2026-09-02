import { Module } from '@nestjs/common';

import { CollectionsCacheService } from './collections-cache.service';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

@Module({
  controllers: [CollectionsController],
  providers: [CollectionsService, CollectionsCacheService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
