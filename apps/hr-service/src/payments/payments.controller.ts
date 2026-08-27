import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── GET /v1/payments/monthly ──────────────────────────────────────────────
  @Get('monthly')
  @ApiOperation({ summary: 'Listar pagos del mes para el almacén' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08', description: 'Mes contable en formato YYYY-MM' })
  @ApiResponse({ status: 200, description: 'Lista de pagos del período' })
  getByMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
  ) {
    return this.paymentsService.getByMonth(user.warehouseId, month);
  }

  // ── GET /v1/payments/payroll ──────────────────────────────────────────────
  @Get('payroll')
  @ApiOperation({ summary: 'Vista de nómina por colaborador' })
  @ApiQuery({ name: 'teamId', required: true, description: 'UUID del colaborador' })
  @ApiQuery({ name: 'month', required: true, example: '7', description: 'Mes (1-12)' })
  @ApiQuery({ name: 'year', required: true, example: '2026', description: 'Año' })
  @ApiQuery({ name: 'period', required: false, example: 'full', description: 'full | q1 | q2' })
  @ApiResponse({ status: 200, description: 'Cálculo de nómina con asistencia y movimientos' })
  getPayroll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('teamId') teamId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('period') period?: string,
  ) {
    const viewPeriod = period === 'q1' || period === 'q2' ? period : 'full';
    return this.paymentsService.getPayrollForTeam(
      user.warehouseId,
      teamId,
      parseInt(month, 10),
      parseInt(year, 10),
      viewPeriod,
    );
  }

  // ── POST /v1/payments ─────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar pago al personal (salario, bono, adelanto)' })
  @ApiResponse({ status: 201, description: 'Pago registrado exitosamente' })
  @ApiResponse({ status: 404, description: 'Miembro del equipo no encontrado' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.paymentsService.create(dto, user.id);
  }

  // ── PATCH /v1/payments/:id ────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos de un pago' })
  @ApiParam({ name: 'id', description: 'UUID del pago' })
  @ApiResponse({ status: 200, description: 'Pago actualizado' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  update(@Param('id') id: string, @Body() dto: Partial<CreatePaymentDto>) {
    return this.paymentsService.update(id, dto);
  }

  // ── DELETE /v1/payments/:id ───────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar pago' })
  @ApiParam({ name: 'id', description: 'UUID del pago' })
  @ApiResponse({ status: 204, description: 'Pago eliminado' })
  @ApiResponse({ status: 404, description: 'Pago no encontrado' })
  async remove(@Param('id') id: string) {
    await this.paymentsService.remove(id);
  }
}
