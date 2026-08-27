import { Module } from '@nestjs/common';
import { CashflowController } from './cashflow.controller';
import { CashflowService } from './cashflow.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [CashflowController],
  providers: [CashflowService],
  exports: [CashflowService],
})
export class CashflowModule {}
