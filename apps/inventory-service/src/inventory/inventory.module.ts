import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryBalanceService } from './inventory-balance.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [InventoryController],
  providers: [InventoryBalanceService],
  exports: [InventoryBalanceService],
})
export class InventoryModule {}
