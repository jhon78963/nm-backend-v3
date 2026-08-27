import { Module } from '@nestjs/common';
import { FinancialSummaryController } from './financial-summary.controller';
import { FinancialSummaryService } from './financial-summary.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [FinancialSummaryController],
  providers: [FinancialSummaryService],
  exports: [FinancialSummaryService],
})
export class FinancialSummaryModule {}
