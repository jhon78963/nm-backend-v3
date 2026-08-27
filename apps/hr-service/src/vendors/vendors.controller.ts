import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { UpdateVendorDto, UpsertVendorDto } from './dto/upsert-vendor.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vendors', version: '1' })
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ── GET /v1/vendors ───────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar proveedores del almacén' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre, teléfono o dirección' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiResponse({ status: 200, description: 'Lista paginada de proveedores' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.vendorsService.findAll(user.warehouseId, query);
  }

  // ── GET /v1/vendors/:id ───────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por ID' })
  @ApiParam({ name: 'id', description: 'UUID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  findById(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  // ── POST /v1/vendors ──────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  create(
    @Body() dto: UpsertVendorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendorsService.create(dto, user.warehouseId);
  }

  // ── PATCH /v1/vendors/:id ─────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos del proveedor' })
  @ApiParam({ name: 'id', description: 'UUID del proveedor' })
  @ApiResponse({ status: 200, description: 'Proveedor actualizado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(id, dto);
  }

  // ── DELETE /v1/vendors/:id ────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proveedor (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID del proveedor' })
  @ApiResponse({ status: 204, description: 'Proveedor eliminado' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  async remove(@Param('id') id: string) {
    await this.vendorsService.remove(id);
  }
}
