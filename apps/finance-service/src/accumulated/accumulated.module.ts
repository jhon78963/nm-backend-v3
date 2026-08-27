import { Module } from '@nestjs/common';
import { AccumulatedController } from './accumulated.controller';
import { AccumulatedAccountService } from './accumulated-account.service';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule],
  controllers: [AccumulatedController],
  providers: [AccumulatedAccountService],
  exports: [AccumulatedAccountService],
})
export class AccumulatedModule {}
