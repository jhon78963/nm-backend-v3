import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { RegisterBulkPurchaseDto } from './dto/register-bulk-purchase.dto';
import { CancelPurchaseDto } from './dto/cancel-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { UpdatePurchaseLineDto } from './dto/update-purchase-line.dto';
import { AppendPurchaseLinesDto } from './dto/append-purchase-lines.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'purchases', version: '1' })
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // ── GET /v1/purchases ─────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar compras paginadas del almacén' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'perPage', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Lista paginada de compras con proveedor y conteo de líneas' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(20), ParseIntPipe) perPage: number,
  ) {
    return this.purchasesService.findAll(user.warehouseId, page, perPage);
  }

  // ── PATCH /v1/purchases/:id ───────────────────────────────────────────────
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar cabecera de compra activa' })
  @ApiParam({ name: 'id', description: 'UUID de la compra' })
  updateHeader(@Param('id') id: string, @Body() dto: UpdatePurchaseDto) {
    return this.purchasesService.updateHeader(id, dto);
  }

  // ── POST /v1/purchases/:id/lines/bulk ───────────────────────────────────────
  @Post(':id/lines/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar líneas a una compra activa' })
  @ApiParam({ name: 'id', description: 'UUID de la compra' })
  appendLines(
    @Param('id') id: string,
    @Body() dto: AppendPurchaseLinesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.appendLines(id, dto, user.id);
  }

  // ── PATCH /v1/purchases/:id/lines/:lineId ────────────────────────────────
  @Patch(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una línea de compra activa' })
  updateLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdatePurchaseLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.updateLine(id, lineId, dto, user.id);
  }

  // ── DELETE /v1/purchases/:id/lines/:lineId ───────────────────────────────
  @Delete(':id/lines/:lineId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar una línea de compra activa' })
  deleteLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.deleteLine(id, lineId, user.id);
  }

  // ── GET /v1/purchases/:id ─────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Detalle completo de una compra (cabecera + líneas + colores)' })
  @ApiParam({ name: 'id', description: 'UUID de la compra' })
  @ApiResponse({ status: 200, description: 'Compra encontrada con todas sus líneas' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  findById(@Param('id') id: string) {
    return this.purchasesService.findById(id);
  }

  // ── POST /v1/purchases ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar compra masiva (cabecera + líneas + ajuste de inventario, todo en una TX)',
  })
  @ApiResponse({ status: 201, description: 'Compra registrada e inventario ajustado' })
  @ApiResponse({ status: 400, description: 'Error en colorDeltas o talla no encontrada' })
  registerBulk(
    @Body() dto: RegisterBulkPurchaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.registerBulk(dto, user.id);
  }

  // ── POST /v1/purchases/:id/cancel ─────────────────────────────────────────
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar compra y revertir stock (inmutable: genera movimiento OUT)' })
  @ApiParam({ name: 'id', description: 'UUID de la compra a cancelar' })
  @ApiResponse({ status: 200, description: 'Compra cancelada y stock revertido' })
  @ApiResponse({ status: 400, description: 'La compra ya estaba cancelada' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelPurchaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchasesService.cancel(id, dto.reason, user.id);
  }
}
