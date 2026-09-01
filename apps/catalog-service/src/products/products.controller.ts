import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import dayjs from 'dayjs';
import { ProductsService } from './products.service';
import { ProductExportService } from './product-export.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { AddProductSizeDto, UpdateProductSizeDto } from './dto/add-product-size.dto';
import { AddSizeColorDto } from './dto/add-size-color.dto';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { WarehouseGuard } from '@app/common/guards/warehouse.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, WarehouseGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productExportService: ProductExportService,
  ) {}

  // ── GET /v1/products ───────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar productos con filtros y paginación' })
  findAll(
    @Query() filters: ProductFiltersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.findAll(filters, user.warehouseId);
  }

  // ── GET /v1/products/pos-search ────────────────────────────────────────────
  @Get('pos-search')
  @ApiOperation({ summary: 'Búsqueda rápida para POS (por nombre o barcode)' })
  searchForPos(@Query('q') query: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.searchForPos(query ?? '', user.warehouseId);
  }

  @Get('export/excel')
  @ApiOperation({ summary: 'Exportar inventario de productos a Excel' })
  @ApiQuery({ name: 'warehouseId', required: false })
  async exportToExcel(
    @Query('warehouseId') warehouseId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const buffer = await this.productExportService.export(warehouseId, user);
    const filename = `productos_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    return new StreamableFile(buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  // ── GET /v1/products/:id/history ─────────────────────────────────────────
  @Get(':id/history')
  @ApiOperation({ summary: 'Historial de cambios del producto' })
  getHistory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.getHistory(id, user.warehouseId);
  }

  // ── GET /v1/products/:id ───────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findById(id, user.warehouseId);
  }

  // ── POST /v1/products ──────────────────────────────────────────────────────
  @Post()
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Crear producto con tallas y colores' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user.id);
  }

  // ── PATCH /v1/products/:id ────────────────────────────────────────────────
  @Patch(':id')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user.id);
  }

  // ── DELETE /v1/products/:id ───────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('Admin', 'Super Admin')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.remove(id, user.id);
  }

  // ── POST /v1/products/:id/sizes ───────────────────────────────────────────
  @Post(':id/sizes')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Agregar talla a producto' })
  addSize(
    @Param('id') id: string,
    @Body() dto: AddProductSizeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.addSize(id, dto, user.id);
  }

  // ── PATCH /v1/products/:id/sizes/:sizeId ─────────────────────────────────
  @Patch(':id/sizes/:sizeId')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  updateSize(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
    @Body() dto: UpdateProductSizeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.updateSize(id, sizeId, dto, user.id);
  }

  // ── DELETE /v1/products/:id/sizes/:sizeId ────────────────────────────────
  @Delete(':id/sizes/:sizeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('Admin', 'Super Admin')
  removeSize(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.removeSize(id, sizeId, user.id);
  }

  // ── POST /v1/products/:id/sizes/:sizeId/colors ───────────────────────────
  @Post(':id/sizes/:sizeId/colors')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Agregar color a talla de producto' })
  addColor(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
    @Body() dto: AddSizeColorDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.addColor(id, sizeId, dto, user.id);
  }

  // ── DELETE /v1/products/:id/sizes/:sizeId/colors/:colorId ─────────────────
  @Delete(':id/sizes/:sizeId/colors/:colorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('Admin', 'Super Admin')
  removeColor(
    @Param('id') id: string,
    @Param('sizeId') sizeId: string,
    @Param('colorId') colorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.removeColor(id, sizeId, colorId, user.id);
  }
}
