import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayrollCalculatorService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
