import {
  Controller, Get, Post, Patch,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import {
  AccumulatedAccountService,
  InitializeAccountDto,
  MonthEndTransferDto,
} from './accumulated-account.service';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Accumulated Account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'accumulated', version: '1' })
export class AccumulatedController {
  constructor(private readonly accumulatedService: AccumulatedAccountService) {}

  // ── GET /v1/accumulated/settings ──────────────────────────────────────────
  @Get('settings')
  @ApiOperation({ summary: 'Obtener configuración de cuenta acumulada del almacén' })
  @ApiResponse({ status: 200, description: 'Configuración de cuenta acumulada' })
  @ApiResponse({ status: 404, description: 'Cuenta acumulada no inicializada' })
  showSettings(@CurrentUser() user: AuthenticatedUser) {
    return this.accumulatedService.showSettings(user.warehouseId);
  }

  // ── POST /v1/accumulated/settings ─────────────────────────────────────────
  @Post('settings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inicializar cuenta acumulada (solo una vez por almacén)' })
  @ApiResponse({ status: 201, description: 'Cuenta acumulada inicializada' })
  @ApiResponse({ status: 400, description: 'La cuenta acumulada ya fue inicializada' })
  initializeSettings(@Body() dto: InitializeAccountDto) {
    return this.accumulatedService.initializeSettings(dto);
  }

  // ── PATCH /v1/accumulated/settings ────────────────────────────────────────
  @Patch('settings')
  @ApiOperation({ summary: 'Actualizar saldos iniciales de la cuenta acumulada' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Cuenta acumulada no inicializada' })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: Partial<InitializeAccountDto>,
  ) {
    return this.accumulatedService.updateSettings(user.warehouseId, dto);
  }

  // ── GET /v1/accumulated/preview ───────────────────────────────────────────
  @Get('preview')
  @ApiOperation({ summary: 'Vista previa del cierre de mes: saldo proyectado' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08', description: 'Mes YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Proyección del saldo al cierre del mes' })
  @ApiResponse({ status: 404, description: 'Cuenta acumulada no inicializada' })
  monthEndPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
  ) {
    return this.accumulatedService.monthEndPreview(user.warehouseId, month);
  }

  // ── GET /v1/accumulated/transfers ─────────────────────────────────────────
  @Get('transfers')
  @ApiOperation({ summary: 'Listar cierres de mes registrados' })
  @ApiResponse({ status: 200, description: 'Historial de transferencias de cierre de mes' })
  listTransfers(@CurrentUser() user: AuthenticatedUser) {
    return this.accumulatedService.listTransfers(user.warehouseId);
  }

  // ── POST /v1/accumulated/transfers ────────────────────────────────────────
  @Post('transfers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar cierre de mes con montos reales' })
  @ApiResponse({ status: 201, description: 'Cierre de mes registrado' })
  @ApiResponse({ status: 400, description: 'Ya existe un cierre para ese mes' })
  recordTransfer(
    @Body() dto: MonthEndTransferDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.accumulatedService.recordTransfer(dto, user.id);
  }
}
