import {
  Controller, Get, Post, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiBody,
} from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('AI Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'ai', version: '1' })
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  private canViewPurchasePrice(user: AuthenticatedUser): boolean {
    return user.roles.some((role) => ['Admin', 'SuperAdmin', 'Owner'].includes(role));
  }

  @Get('products/:productId/context')
  @ApiOperation({ summary: 'Contexto de producto para el motor de IA (historial de ventas, stock, precios)' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  @ApiResponse({ status: 200, description: 'Contexto del producto' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  getProductContext(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.aiProxyService.getProductContext(
      productId,
      user.warehouseId,
      this.canViewPurchasePrice(user),
    );
  }

  @Post('predict/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predicción de precio óptimo para un producto' })
  @ApiBody({ schema: { example: { product_id: 'uuid' } } })
  @ApiResponse({ status: 200, description: 'Predicción de precio retornada por el AI Engine' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  predictPrice(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    const productId = String(body.product_id ?? body.productId ?? '');
    return this.aiProxyService.predictPrice(
      productId,
      user.warehouseId,
      this.canViewPurchasePrice(user),
    );
  }

  @Post('predict/demand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predicción de demanda futura para un producto' })
  @ApiBody({ schema: { example: { product_id: 'uuid', horizon_days: 30 } } })
  @ApiResponse({ status: 200, description: 'Predicción de demanda retornada por el AI Engine' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  predictDemand(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Record<string, unknown>,
  ) {
    const productId = String(body.product_id ?? body.productId ?? '');
    const horizonDays = Number(body.horizon_days ?? body.horizonDays ?? 30);
    return this.aiProxyService.predictDemand(
      productId,
      user.warehouseId,
      this.canViewPurchasePrice(user),
      Number.isFinite(horizonDays) ? horizonDays : 30,
    );
  }

  @Get('reports/products-inventory')
  @ApiOperation({ summary: 'Reporte de inventario de productos enriquecido con IA' })
  @ApiResponse({ status: 200, description: 'Reporte de inventario con análisis de IA' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  getProductsInventoryReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query('horizon_days') horizonDays?: string,
  ) {
    const parsedHorizon = Number(horizonDays ?? 30);
    return this.aiProxyService.getProductsInventoryReport(
      user.warehouseId,
      Number.isFinite(parsedHorizon) ? parsedHorizon : 30,
      this.canViewPurchasePrice(user),
    );
  }
}
