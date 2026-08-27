import {
  Controller, Get, Post, Param, Body,
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

  // ── GET /v1/ai/products/:productId/context ────────────────────────────────
  @Get('products/:productId/context')
  @ApiOperation({ summary: 'Contexto de producto para el motor de IA (historial de ventas, stock, precios)' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  @ApiResponse({ status: 200, description: 'Contexto del producto retornado por el AI Engine' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  getProductContext(@Param('productId') productId: string) {
    return this.aiProxyService.getProductContext(productId);
  }

  // ── POST /v1/ai/predict/price ─────────────────────────────────────────────
  @Post('predict/price')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predicción de precio óptimo para un producto' })
  @ApiBody({ schema: { example: { productId: 'uuid', warehouseId: 'uuid', month: '2026-08' } } })
  @ApiResponse({ status: 200, description: 'Predicción de precio retornada por el AI Engine' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  predictPrice(@Body() body: Record<string, unknown>) {
    const { productId, ...rest } = body;
    return this.aiProxyService.predictPrice(productId as string, rest);
  }

  // ── POST /v1/ai/predict/demand ────────────────────────────────────────────
  @Post('predict/demand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Predicción de demanda futura para un producto' })
  @ApiBody({ schema: { example: { productId: 'uuid', warehouseId: 'uuid', horizonDays: 30 } } })
  @ApiResponse({ status: 200, description: 'Predicción de demanda retornada por el AI Engine' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  predictDemand(@Body() body: Record<string, unknown>) {
    const { productId, ...rest } = body;
    return this.aiProxyService.predictDemand(productId as string, rest);
  }

  // ── GET /v1/ai/reports/products-inventory ─────────────────────────────────
  @Get('reports/products-inventory')
  @ApiOperation({ summary: 'Reporte de inventario de productos generado por el AI Engine' })
  @ApiResponse({ status: 200, description: 'Reporte de inventario con análisis de IA' })
  @ApiResponse({ status: 503, description: 'AI Engine no disponible' })
  getProductsInventoryReport(@CurrentUser() user: AuthenticatedUser) {
    return this.aiProxyService.getProductsInventoryReport(user.warehouseId);
  }
}
