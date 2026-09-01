import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductSizesController } from './product-sizes.controller';
import { ProductsService } from './products.service';
import { ProductExportService } from './product-export.service';
import { ProductHistoryModule } from '../product-history/product-history.module';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule, ProductHistoryModule],
  controllers: [ProductsController, ProductSizesController],
  providers: [ProductsService, ProductExportService],
  exports: [ProductsService],
})
export class ProductsModule {}
