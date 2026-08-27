import {
  Controller, Get, Post, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
  ApiQuery, ApiParam,
} from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { WarehouseGuard } from '@app/common/guards/warehouse.guard';
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

  @Get(':id')
  @ApiParam({ name: 'id' })
  @ApiOperation({ summary: 'Obtener venta por ID' })
  findById(@Param('id') id: string) {
    return this.salesService.findById(id);
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
