import { Module } from '@nestjs/common';

import { CustomerAuthModule } from '../customer-auth/customer-auth.module';
import { ProductReviewsAdminController, ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';

@Module({
  imports: [CustomerAuthModule],
  controllers: [ProductReviewsController, ProductReviewsAdminController],
  providers: [ProductReviewsService],
  exports: [ProductReviewsService],
})
export class ProductReviewsModule {}
