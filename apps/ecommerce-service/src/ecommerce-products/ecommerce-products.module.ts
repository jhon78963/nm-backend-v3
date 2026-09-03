import { Module } from '@nestjs/common';

import { ProductReviewsModule } from '../product-reviews/product-reviews.module';
import { EcommerceProductsController } from './ecommerce-products.controller';
import { EcommerceProductsService } from './ecommerce-products.service';

@Module({
  imports: [ProductReviewsModule],
  controllers: [EcommerceProductsController],
  providers: [EcommerceProductsService],
  exports: [EcommerceProductsService],
})
export class EcommerceProductsModule {}
