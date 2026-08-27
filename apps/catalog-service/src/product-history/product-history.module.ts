import { Module } from '@nestjs/common';
import { ProductHistoryService } from './product-history.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  providers: [ProductHistoryService],
  exports: [ProductHistoryService],
})
export class ProductHistoryModule {}
