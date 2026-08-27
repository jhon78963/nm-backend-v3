import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { ExchangeSaleDto } from './dto/exchange-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { WarehouseGuard } from '@app/common/guards/warehouse.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, WarehouseGuard)
@Controller({ path: 'sales', version: '1' })
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ventas del almacén con filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2026-08-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2026-08-31' })
  @ApiQuery({ name: 'documentType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('documentType') documentType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.findAll({
      warehouseId: user.warehouseId,
      page: page ? Number(page) : 1,
      perPage: perPage ? Number(perPage) : 20,
      dateFrom,
      dateTo,
      documentType,
      status,
      search,
    });
  }

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  @Roles('Vendedora', 'Vendedor', 'Admin', 'Super Admin')
  @ApiOperation({ summary: 'Registrar cambio de mercadería en una venta existente' })
  exchange(
    @Body() dto: ExchangeSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.processExchange(dto, user);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Obtener venta por ID' })
  findById(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Patch(':id')
  @Roles('Vendedora', 'Vendedor', 'Admin', 'Super Admin')
  @ApiOperation({ summary: 'Actualizar venta (ítems, pagos y fecha)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Anular venta (alias DELETE)' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.delete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Anular venta' })
  cancel(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.salesService.delete(id, user.id);
  }
}
