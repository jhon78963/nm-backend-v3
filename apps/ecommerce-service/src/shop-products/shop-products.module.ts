import { Module } from '@nestjs/common';

import { ProductReviewsModule } from '../product-reviews/product-reviews.module';
import { ShopCollectionsModule } from '../shop-collections/shop-collections.module';
import { ShopProductsController } from './shop-products.controller';
import { ShopProductsService } from './shop-products.service';

@Module({
  imports: [ShopCollectionsModule, ProductReviewsModule],
  controllers: [ShopProductsController],
  providers: [ShopProductsService],
})
export class ShopProductsModule {}
