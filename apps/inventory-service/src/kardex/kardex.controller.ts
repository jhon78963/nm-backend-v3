import {
  Controller, Get, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { KardexService } from './kardex.service';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Kardex')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'kardex', version: '1' })
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  // ── GET /v1/kardex ────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Reporte Kardex paginado: historial de movimientos con saldo acumulado',
  })
  @ApiQuery({ name: 'productId',     required: false, description: 'Filtrar por producto' })
  @ApiQuery({ name: 'productSizeId', required: false, description: 'Filtrar por talla' })
  @ApiQuery({ name: 'colorId',       required: false, description: 'Filtrar por color' })
  @ApiQuery({ name: 'movementType',  required: false, description: 'Tipo de movimiento (PURCHASE, SALE, ADJUSTMENT…)' })
  @ApiQuery({ name: 'dateFrom',      required: false, example: '2026-08-01', description: 'Desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo',        required: false, example: '2026-08-31', description: 'Hasta (YYYY-MM-DD)' })
  @ApiQuery({ name: 'page',          required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'perPage',       required: false, type: Number, example: 50 })
  @ApiResponse({ status: 200, description: 'Lista paginada de movimientos de inventario con balance' })
  getKardex(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId')     productId?: string,
    @Query('productSizeId') productSizeId?: string,
    @Query('colorId')       colorId?: string,
    @Query('movementType')  movementType?: string,
    @Query('dateFrom')      dateFrom?: string,
    @Query('dateTo')        dateTo?: string,
    @Query('page',    new DefaultValuePipe(1),  ParseIntPipe) page:    number = 1,
    @Query('perPage', new DefaultValuePipe(50), ParseIntPipe) perPage: number = 50,
  ) {
    return this.kardexService.getKardex({
      warehouseId: user.warehouseId,
      productId,
      productSizeId,
      colorId,
      movementType,
      dateFrom,
      dateTo,
      page,
      perPage,
    });
  }

  // ── GET /v1/kardex/snapshot/:productId ────────────────────────────────────
  @Get('snapshot/:productId')
  @ApiOperation({ summary: 'Snapshot de stock actual por talla/color para un producto' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  @ApiResponse({ status: 200, description: 'Stock actual desglosado por talla y color' })
  getSnapshot(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kardexService.getProductStockSnapshot(productId, user.warehouseId);
  }
}
