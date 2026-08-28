import { Module } from '@nestjs/common';
import { CashflowController } from './cashflow.controller';
import { CashflowService } from './cashflow.service';
import { VoucherController } from './vouchers/voucher.controller';
import { VoucherService } from './vouchers/voucher.service';
import { DatabaseModule } from '@app/database';
import { StorageClientModule } from '@app/storage-client';

@Module({
  imports: [DatabaseModule, StorageClientModule],
  controllers: [CashflowController, VoucherController],
  providers: [CashflowService, VoucherService],
  exports: [CashflowService],
})
export class CashflowModule {}
