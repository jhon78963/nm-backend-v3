import {
  Controller, Get, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { ReconciliationService } from './reconciliation.service';
import { BulkUpdateReconciliationDto } from './dto/bulk-update-reconciliation.dto';

@ApiTags('Reconciliation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'inventory/reconciliation', version: '1' })
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar productos para reconciliación de inventario' })
  @ApiQuery({ name: 'q', required: true })
  search(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q: string,
  ) {
    return this.reconciliationService.search(q, user.warehouseId);
  }

  @Get(':productId')
  @ApiParam({ name: 'productId' })
  @ApiOperation({ summary: 'Obtener producto con stock para reconciliación' })
  async getProduct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    const product = await this.reconciliationService.getProduct(productId, user.warehouseId);
    return { product };
  }

  @Get(':productId/pos-sales')
  @ApiParam({ name: 'productId' })
  @ApiOperation({ summary: 'Ventas POS del producto desde la última reconciliación' })
  getPosSalesSince(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.reconciliationService.getPosSalesSince(productId, user.warehouseId);
  }

  @Put(':productId')
  @ApiParam({ name: 'productId' })
  @ApiOperation({ summary: 'Actualizar stock de variantes del producto' })
  bulkUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
    @Body() body: BulkUpdateReconciliationDto,
  ) {
    return this.reconciliationService.bulkUpdate(
      productId,
      user.warehouseId,
      body,
    );
  }
}
