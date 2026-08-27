import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Teams')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'teams', version: '1' })
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ── GET /v1/teams ─────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Listar personal del almacén',
    description: 'Retorna todos los miembros activos del almacén del usuario autenticado, ' +
      'incluyendo el usuario vinculado (si existe) y conteo de asistencias y pagos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de miembros del equipo',
    schema: {
      example: [{
        id: 'uuid', dni: '12345678', name: 'Juan', surname: 'Pérez',
        salary: 1200, warehouseId: 'uuid',
        user: { id: 'uuid', username: 'jperez', email: 'j@nm.com' },
        _count: { attendances: 22, payments: 3 },
      }],
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado — Bearer token requerido' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, apellido o DNI' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.teamsService.findAll(user.warehouseId, query);
  }

  // ── GET /v1/teams/:id ─────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un miembro del equipo por ID',
    description: 'Incluye las últimas 30 asistencias y los últimos 10 pagos del miembro.',
  })
  @ApiParam({ name: 'id', description: 'UUID del miembro del equipo', example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 200, description: 'Miembro del equipo encontrado', type: CreateTeamDto })
  @ApiResponse({ status: 404, description: 'Miembro del equipo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findById(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  // ── POST /v1/teams ────────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nuevo miembro del equipo',
    description: 'Crea un nuevo trabajador en el almacén. El DNI debe ser único por almacén.',
  })
  @ApiBody({ type: CreateTeamDto })
  @ApiResponse({ status: 201, description: 'Miembro creado exitosamente', type: CreateTeamDto })
  @ApiResponse({ status: 409, description: 'Ya existe un miembro con ese DNI en el almacén' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  // ── PATCH /v1/teams/:id ───────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar datos del miembro del equipo',
    description: 'Actualización parcial — solo los campos enviados se modifican.',
  })
  @ApiParam({ name: 'id', description: 'UUID del miembro', example: 'a1b2c3d4-...' })
  @ApiBody({
    type: CreateTeamDto,
    description: 'Campos a actualizar (todos opcionales en PATCH)',
  })
  @ApiResponse({ status: 200, description: 'Miembro actualizado', type: CreateTeamDto })
  @ApiResponse({ status: 404, description: 'Miembro del equipo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTeamDto>) {
    return this.teamsService.update(id, dto);
  }

  // ── DELETE /v1/teams/:id ──────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dar de baja a un miembro del equipo',
    description: 'Soft delete — marca el registro como eliminado sin borrar de la base de datos.',
  })
  @ApiParam({ name: 'id', description: 'UUID del miembro', example: 'a1b2c3d4-...' })
  @ApiResponse({ status: 204, description: 'Miembro eliminado (soft delete)' })
  @ApiResponse({ status: 404, description: 'Miembro del equipo no encontrado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async remove(@Param('id') id: string) {
    await this.teamsService.remove(id);
  }
}
