import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@app/common/guards/permissions.guard';
import { Permissions } from '@app/common/decorators/permissions.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { CashflowReportsService } from './cashflow-reports.service';

@ApiTags('Cashflow Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'cashflow', version: '1' })
export class CashflowReportsController {
  constructor(private readonly cashflowReportsService: CashflowReportsService) {}

  @Get('daily')
  @Permissions('cashflow.getDaily')
  @ApiOperation({ summary: 'Reporte diario de caja' })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-25' })
  getDaily(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
    @Query('filters') filters?: string | string[],
  ) {
    const activeFilters = Array.isArray(filters)
      ? filters
      : typeof filters === 'string' && filters.trim()
        ? filters.split(',')
        : undefined;

    return this.cashflowReportsService.getDaily(
      user.warehouseId,
      date,
      activeFilters,
    );
  }

  @Get('monthly')
  @Permissions('cashflow.getDaily')
  @ApiOperation({ summary: 'Reporte mensual de caja' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08' })
  @ApiQuery({ name: 'warehouseId', required: false })
  getMonthlyReport(
    @Query('month') month: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.cashflowReportsService.getMonthlyReport(month, warehouseId);
  }

  @Get('admin/monthly')
  @Permissions('cashflow.getAdminMonthlyReport')
  @ApiOperation({ summary: 'Reporte mensual de gastos administrativos' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08' })
  getAdminMonthlyReport(@Query('month') month: string) {
    return this.cashflowReportsService.getMonthlyAdminExpenses(month);
  }

  @Get('accumulated/monthly')
  @Permissions('cashflow.getAccumulatedExpensesReport')
  @ApiOperation({ summary: 'Reporte mensual de egresos de cuenta acumulada' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08' })
  getAccumulatedMonthlyReport(@Query('month') month: string) {
    return this.cashflowReportsService.getMonthlyAccumulatedExpenses(month);
  }
}
