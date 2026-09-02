import { Module } from '@nestjs/common';

import { ShopCollectionsCacheService } from './shop-collections-cache.service';
import { ShopCollectionsController } from './shop-collections.controller';
import { ShopCollectionsService } from './shop-collections.service';

@Module({
  controllers: [ShopCollectionsController],
  providers: [ShopCollectionsService, ShopCollectionsCacheService],
  exports: [ShopCollectionsService],
})
export class ShopCollectionsModule {}
