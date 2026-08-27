import {
  Controller, Get, Post, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ── POST /v1/attendance ───────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar o actualizar asistencia (upsert por teamId + fecha)' })
  @ApiResponse({ status: 201, description: 'Asistencia registrada o actualizada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  record(@Body() dto: RecordAttendanceDto) {
    return this.attendanceService.record(dto);
  }

  // ── GET /v1/attendance/daily ──────────────────────────────────────────────
  @Get('daily')
  @ApiOperation({ summary: 'Resumen de asistencia del día para el almacén' })
  @ApiQuery({ name: 'date', required: true, example: '2026-08-25', description: 'Fecha en formato YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Estado de asistencia de todos los miembros' })
  getDailySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getDailySummary(user.warehouseId, date);
  }

  // ── GET /v1/attendance/monthly ────────────────────────────────────────────
  @Get('monthly')
  @ApiOperation({ summary: 'Asistencia mensual por colaborador o resumen por almacén' })
  @ApiQuery({ name: 'month', required: true, example: '2026-08', description: 'Mes en formato YYYY-MM' })
  @ApiQuery({ name: 'teamId', required: false, description: 'UUID del colaborador; si se envía, retorna registros por fecha' })
  @ApiResponse({ status: 200, description: 'Registros del mes o resumen por empleado' })
  getByMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month: string,
    @Query('teamId') teamId?: string,
  ) {
    if (teamId) {
      return this.attendanceService.getByMonthForTeam(user.warehouseId, teamId, month);
    }
    return this.attendanceService.getByMonth(user.warehouseId, month);
  }
}
