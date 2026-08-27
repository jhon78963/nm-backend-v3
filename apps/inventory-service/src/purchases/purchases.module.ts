import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { DatabaseModule } from '@app/database';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [DatabaseModule, InventoryModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
