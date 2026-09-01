import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse,
} from '@nestjs/swagger';
import dayjs from 'dayjs';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@app/common/guards/permissions.guard';
import { Permissions } from '@app/common/decorators/permissions.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { FinancialSummaryService } from './financial-summary.service';

@ApiTags('Financial Summary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'financial-summary', version: '1' })
export class FinancialSummaryController {
  constructor(private readonly financialSummaryService: FinancialSummaryService) {}

  @Get()
  @Permissions('financialSummary.getSummary')
  @ApiOperation({ summary: 'Resumen financiero consolidado del mes' })
  @ApiQuery({ name: 'month', required: false, example: '2026-08' })
  @ApiResponse({ status: 200, description: 'Dashboard financiero consolidado' })
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
