import {
  Controller, Get, Post, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { InventoryBalanceService } from './inventory-balance.service';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly inventoryService: InventoryBalanceService) {}

  // ── GET /v1/inventory/stock ───────────────────────────────────────────────
  @Get('stock')
  @ApiOperation({ summary: 'Stock actual del almacén, agrupado por producto+talla+color' })
  @ApiQuery({ name: 'productId', required: false, description: 'Filtrar por producto' })
  @ApiResponse({ status: 200, description: 'Lista de saldos de inventario con detalle de producto y color' })
  getStockSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('productId') productId?: string,
  ) {
    return this.inventoryService.getStockSummary(user.warehouseId, productId);
  }

  // ── POST /v1/inventory/adjust ─────────────────────────────────────────────
  @Post('adjust')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ajuste manual de stock (reconciliación física). Crea movement + actualiza balance.',
  })
  @ApiResponse({ status: 201, description: 'Ajuste registrado en ledger e inventario actualizado' })
  @ApiResponse({ status: 400, description: 'Delta inválido o entidad no encontrada' })
  adjust(
    @Body() dto: StockAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.adjust({
      warehouseId:   dto.warehouseId,
      productSizeId: dto.productSizeId,
      colorId:       dto.colorId,
      delta:         dto.delta,
      movementType:  dto.movementType ?? 'ADJUSTMENT',
      referenceId:   dto.referenceId,
      referenceType: dto.referenceType,
      createdById:   user.id,
    });
  }
}
