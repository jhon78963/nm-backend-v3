import { Controller, Get, Param, UseGuards, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { TicketRenderService } from './ticket-render.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly ticketRenderService: TicketRenderService) {}

  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: 'Generar ticket HTML para impresión térmica (80mm)' })
  @ApiParam({ name: 'id', description: 'UUID de la venta' })
  async getTicketHtml(@Param('id') id: string): Promise<string> {
    return this.ticketRenderService.render(id);
  }
}
