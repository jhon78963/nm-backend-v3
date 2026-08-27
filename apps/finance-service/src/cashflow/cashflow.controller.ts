import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery, ApiBody,
} from '@nestjs/swagger';
import { CashflowService } from './cashflow.service';
import { CreateCashMovementDto, MovementType, CashPaymentMethod } from './dto/create-cash-movement.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Cashflow')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'cashflow', version: '1' })
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  // ── GET /v1/cashflow ─────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar movimientos de caja con filtros' })
  @ApiQuery({ name: 'month', required: false, example: '2026-08' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'warehouseId', required: false })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.cashflowService.findAll(
      warehouseId ?? user.warehouseId,
      { month, type, category },
    );
  }

  // ── GET /v1/cashflow/daily ────────────────────────────────────────────────
  @Get('daily')
  @ApiOperation({
    summary: 'Reporte diario de caja',
    description: 'Retorna apertura, todos los movimientos del día y balance de cierre ' +
      'para el almacén del usuario autenticado.',
  })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-25', description: 'Fecha YYYY-MM-DD' })
  @ApiResponse({
    status: 200,
    description: 'Reporte de caja del día',
    schema: {
      example: {
        date: '2026-08-25',
        openingBalance: 1500.00,
        totalIncome: 3200.50,
        totalExpense: 850.00,
        closingBalance: 3850.50,
        movements: [],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getDaily(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
    @Query('filters') filters?: string | string[],
  ) {
    const activeFilters = Array.isArray(filters)
      ? filters
      : typeof filters === 'string' && filters.trim()
        ? filters.split(',')
        : undefined;

    return this.cashflowService.getDaily(
      user.warehouseId,
      date,
      activeFilters,
    );
  }

  // ── GET /v1/cashflow/monthly ──────────────────────────────────────────────
  @Get('monthly')
  @ApiOperation({
    summary: 'Reporte mensual de caja',
    description: 'Retorna totales de ingresos/gastos agrupados por categoría y método de pago. ' +
      'Super Admin puede filtrar por almacén; tienda solo ve sus propios datos.',
  })
  @ApiQuery({ name: 'month', required: true, example: '2026-08', description: 'Mes contable YYYY-MM' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filtrar por almacén (solo Super Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Reporte mensual de ingresos y gastos',
    schema: {
      example: {
        accountingMonth: '2026-08',
        totalIncome: 45000.00,
        totalExpense: 12500.00,
        netBalance: 32500.00,
        incomeCount: 120,
        expenseCount: 45,
        byCategory: [{ category: 'Ventas', type: 'INCOME', amount: 40000 }],
        byPaymentMethod: { CASH: 20000, YAPE: 15000, CARD: 10000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getMonthlyReport(
    @Query('month') month: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.cashflowService.getMonthlyReport(month, warehouseId);
  }

  // ── GET /v1/cashflow/:id ──────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener movimiento de caja por ID',
    description: 'Incluye los vouchers (comprobantes) adjuntos al movimiento, ordenados por posición.',
  })
  @ApiParam({ name: 'id', description: 'UUID del movimiento de caja', example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 200, description: 'Movimiento de caja encontrado', type: CreateCashMovementDto })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findById(@Param('id') id: string) {
    return this.cashflowService.findById(id);
  }

  // ── POST /v1/cashflow ─────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar ingreso o gasto de caja',
    description: `Crea un movimiento de caja. 
- **type: INCOME** → ingreso (ventas manuales, cobros, etc.)
- **type: EXPENSE** → egreso (gastos operativos, pagos a proveedores, etc.)`,
  })
  @ApiBody({
    type: CreateCashMovementDto,
    examples: {
      ingreso: {
        summary: 'Ingreso por venta en efectivo',
        value: {
          warehouseId: 'uuid-almacen',
          type: MovementType.INCOME,
          amount: 250.00,
          category: 'Venta directa',
          paymentMethod: CashPaymentMethod.CASH,
          date: '2026-08-25',
          accountingMonth: '2026-08',
        },
      },
      gasto: {
        summary: 'Gasto operativo con Yape',
        value: {
          warehouseId: 'uuid-almacen',
          type: MovementType.EXPENSE,
          amount: 85.50,
          category: 'Materiales de limpieza',
          paymentMethod: CashPaymentMethod.YAPE,
          description: 'Compra mensual de útiles de limpieza',
          date: '2026-08-25',
          accountingMonth: '2026-08',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Movimiento creado exitosamente', type: CreateCashMovementDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cashflowService.create(dto, user.warehouseId, user.id);
  }

  // ── PATCH /v1/cashflow/:id ────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un movimiento de caja',
    description: 'Actualización parcial — solo los campos enviados se modifican.',
  })
  @ApiParam({ name: 'id', description: 'UUID del movimiento', example: 'a1b2c3d4-...' })
  @ApiBody({
    type: CreateCashMovementDto,
    description: 'Campos a actualizar (todos opcionales en PATCH)',
  })
  @ApiResponse({ status: 200, description: 'Movimiento actualizado', type: CreateCashMovementDto })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCashMovementDto>,
  ) {
    return this.cashflowService.update(id, dto);
  }

  // ── DELETE /v1/cashflow/:id ───────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar movimiento de caja',
    description: 'Soft delete — el registro se marca como eliminado, no se borra físicamente.',
  })
  @ApiParam({ name: 'id', description: 'UUID del movimiento', example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 204, description: 'Movimiento eliminado (soft delete)' })
  @ApiResponse({ status: 404, description: 'Movimiento no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async delete(@Param('id') id: string) {
    await this.cashflowService.delete(id);
  }
}
