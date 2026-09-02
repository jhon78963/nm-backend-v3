import { Module } from '@nestjs/common';

import { EcommerceProductsController } from './ecommerce-products.controller';
import { EcommerceProductsService } from './ecommerce-products.service';

@Module({
  controllers: [EcommerceProductsController],
  providers: [EcommerceProductsService],
  exports: [EcommerceProductsService],
})
export class EcommerceProductsModule {}
