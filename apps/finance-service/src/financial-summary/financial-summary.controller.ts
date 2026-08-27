import {
  Controller, Get, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { FinancialSummaryService } from './financial-summary.service';
import dayjs from 'dayjs';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Financial Summary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'financial-summary', version: '1' })
export class FinancialSummaryController {
  constructor(private readonly financialSummaryService: FinancialSummaryService) {}

  // ── GET /v1/financial-summary ─────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Resumen financiero consolidado del mes (ventas, caja, acumulado, planilla)',
  })
  @ApiQuery({ name: 'month', required: false, example: '2026-08', description: 'Mes en formato YYYY-MM' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard financiero: ventas, cashflow, saldo acumulado y top categorías de gasto',
  })
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
  ) {
    return this.financialSummaryService.getSummary(
      user.warehouseId,
      month ?? dayjs().format('YYYY-MM'),
    );
  }
}
