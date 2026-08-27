import {
  Controller, Get, Query, UseGuards, Res, Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales/daily')
  @ApiOperation({ summary: 'Reporte diario de ventas' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (default: hoy)' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getDailySalesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const targetWarehouse = warehouseId ?? user.warehouseId;
    return this.reportsService.getDailySalesReport(targetDate, targetWarehouse);
  }

  @Get('sales/daily/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Exportar reporte diario en PDF' })
  getDailySalesPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Res() res?: Response,
  ) {
    res?.status(501).json({ message: 'PDF export not yet implemented.' });
  }

  @Get('sales/monthly')
  @ApiOperation({ summary: 'Reporte mensual de ventas' })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM (default: mes actual)' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getMonthlySalesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    const now = new Date();
    const targetMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetWarehouse = warehouseId ?? user.warehouseId;
    return this.reportsService.getMonthlySalesReport(targetMonth, targetWarehouse);
  }

  @Get('sales/monthly/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Exportar reporte mensual en PDF' })
  getMonthlySalesPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Res() res?: Response,
  ) {
    res?.status(501).json({ message: 'PDF export not yet implemented.' });
  }

  @Get('sales/daily-period')
  @ApiOperation({ summary: 'Reporte de ventas por rango de fechas' })
  @ApiQuery({ name: 'start_date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'end_date', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getPeriodSalesReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    const today = new Date().toISOString().slice(0, 10);
    const targetWarehouse = warehouseId ?? user.warehouseId;
    return this.reportsService.getPeriodSalesReport(
      startDate ?? today,
      endDate ?? today,
      targetWarehouse,
    );
  }

  @Get('sales/period/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Exportar reporte de período en PDF' })
  getPeriodSalesPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('warehouse_id') warehouseId?: string,
    @Res() res?: Response,
  ) {
    res?.status(501).json({ message: 'PDF export not yet implemented.' });
  }

  @Get('products')
  @ApiOperation({ summary: 'Inventario de productos con stock' })
  @ApiQuery({ name: 'warehouse_id', required: false })
  getProductsInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    const targetWarehouse = warehouseId ?? user.warehouseId;
    return this.reportsService.getProductsInventory(targetWarehouse);
  }

  @Get('products/export/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Exportar inventario en PDF' })
  getProductsPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query('warehouse_id') warehouseId?: string,
    @Res() res?: Response,
  ) {
    res?.status(501).json({ message: 'PDF export not yet implemented.' });
  }
}
