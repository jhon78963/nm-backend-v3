import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiResponse, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto, UpsertCustomerDto } from './dto/upsert-customer.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del almacén' })
  @ApiQuery({ name: 'search', required: false, description: 'Buscar por nombre o documento' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiResponse({ status: 200, description: 'Lista paginada de clientes' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.customersService.findAll(user.warehouseId, query);
  }

  @Get('pos-search')
  @ApiOperation({
    summary: 'Buscar o registrar cliente por DNI/RUC para el POS',
    description:
      'Busca en BD local; si no existe consulta RENIEC/SUNAT (apis.net.pe) y crea el cliente.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'DNI (8 dígitos) o RUC (11 dígitos)' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado o creado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  @ApiResponse({ status: 503, description: 'Servicio SUNAT/RENIEC no disponible' })
  searchForPos(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') query: string,
  ) {
    return this.customersService.searchForPos(query, user.warehouseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiParam({ name: 'id', description: 'UUID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  create(
    @Body() dto: UpsertCustomerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.customersService.create(dto, user.warehouseId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos del cliente' })
  @ApiParam({ name: 'id', description: 'UUID del cliente' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID del cliente' })
  @ApiResponse({ status: 204, description: 'Cliente eliminado' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  async remove(@Param('id') id: string) {
    await this.customersService.remove(id);
  }
}
