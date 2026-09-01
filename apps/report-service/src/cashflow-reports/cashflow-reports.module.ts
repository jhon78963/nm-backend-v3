import { Module } from '@nestjs/common';
import { CashflowReportsController } from './cashflow-reports.controller';
import { CashflowReportsService } from './cashflow-reports.service';

@Module({
  controllers: [CashflowReportsController],
  providers: [CashflowReportsService],
  exports: [CashflowReportsService],
})
export class CashflowReportsModule {}
