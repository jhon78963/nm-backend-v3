import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketRenderService } from './ticket-render.service';
import { SunatModule } from '../sunat/sunat.module';

@Module({
  imports: [SunatModule],
  controllers: [TicketsController],
  providers: [TicketRenderService],
})
export class TicketsModule {}
