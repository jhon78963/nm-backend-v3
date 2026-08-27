import { Module } from '@nestjs/common';
import { WoocommerceSyncService } from './woocommerce-sync.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  providers: [WoocommerceSyncService],
  exports: [WoocommerceSyncService],
})
export class WoocommerceModule {}
