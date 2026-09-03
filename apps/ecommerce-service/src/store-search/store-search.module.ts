import { Module } from '@nestjs/common';

import { ProductReviewsModule } from '../product-reviews/product-reviews.module';
import { ShopCollectionsModule } from '../shop-collections/shop-collections.module';
import { StoreSearchController } from './store-search.controller';
import { StoreSearchService } from './store-search.service';

@Module({
  imports: [ShopCollectionsModule, ProductReviewsModule],
  controllers: [StoreSearchController],
  providers: [StoreSearchService],
})
export class StoreSearchModule {}
