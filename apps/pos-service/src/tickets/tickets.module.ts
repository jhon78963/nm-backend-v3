import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [SalesModule],
  controllers: [TicketsController],
})
export class TicketsModule {}
