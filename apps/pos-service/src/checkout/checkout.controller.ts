import {
  Controller, Post, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { WarehouseGuard } from '@app/common/guards/warehouse.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('POS — Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, WarehouseGuard)
@Controller({ path: 'checkout', version: '1' })
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * POST /v1/checkout
   * Equivale a PosController@checkout de Laravel.
   * El body recibe los ítems, pagos y tipo de documento.
   * Retorna la venta creada + URL del ticket.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('Vendedora', 'Vendedor', 'Admin', 'Super Admin')
  @ApiOperation({ summary: 'Procesar venta POS (checkout)' })
  @ApiResponse({ status: 201, description: 'Venta procesada exitosamente' })
  @ApiResponse({ status: 400, description: 'Totales de pagos no coinciden' })
  @ApiResponse({ status: 422, description: 'Stock insuficiente para uno o más ítems' })
  async checkout(
    @Body() dto: CheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.checkoutService.process(dto, user.id);
  }
}
