import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SunatModule } from '../sunat/sunat.module';
import { DatabaseModule } from '@app/database';

@Module({
  imports: [DatabaseModule, SunatModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
