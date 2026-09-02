import { Module } from '@nestjs/common';

import { CategoryProductsCacheService } from './category-products-cache.service';
import { CategoryProductsController } from './category-products.controller';
import { CategoryProductsService } from './category-products.service';

@Module({
  controllers: [CategoryProductsController],
  providers: [CategoryProductsService, CategoryProductsCacheService],
  exports: [CategoryProductsService],
})
export class CategoryProductsModule {}
