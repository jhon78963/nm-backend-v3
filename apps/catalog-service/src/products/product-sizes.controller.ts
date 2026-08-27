import {
  Controller, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus, UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { DatabaseService } from '@app/database';
import { IsUUID, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  readColorStock,
  syncMasterBalanceToColorSum,
} from './product-inventory.helper';
import { ProductHistoryService } from '../product-history/product-history.service';

class AddColorByProductSizeDto {
  @ApiProperty()
  @IsUUID()
  colorId: string;

  @ApiPropertyOptional({ description: 'Stock inicial (alias usado por el frontend)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialStock?: number;
}

class UpdateColorStockDto {
  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;
}

/**
 * Expone rutas para gestionar colores de un ProductSize por su ID directo.
 * El frontend Angular usa productSizeId (ID del registro junction ProductSize).
 */
@ApiTags('Product Sizes — Colors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'product-sizes', version: '1' })
export class ProductSizesController {
  constructor(
    private readonly db: DatabaseService,
    private readonly history: ProductHistoryService,
  ) {}

  // ── POST /v1/product-sizes/:productSizeId/colors ──────────────────────────
  @Post(':productSizeId/colors')
  @HttpCode(HttpStatus.CREATED)
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Agregar color a talla por productSizeId' })
  @ApiParam({ name: 'productSizeId' })
  async addColor(
    @Param('productSizeId') productSizeId: string,
    @Body() dto: AddColorByProductSizeDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.db.$transaction(async (tx) => {
      const ps = await tx.productSize.findFirst({
        where: { id: productSizeId, isDeleted: false },
        include: {
          product: { select: { id: true, warehouseId: true } },
          size: { select: { id: true, description: true } },
        },
      });
      if (!ps) throw new NotFoundException('Talla no encontrada.');

      const color = await tx.color.findFirst({
        where: { id: dto.colorId, isDeleted: false },
        select: { id: true, description: true },
      });
      if (!color) throw new NotFoundException('Color no encontrado.');

      const warehouseId = ps.product.warehouseId ?? user.warehouseId;
      const oldStock = await readColorStock(tx, warehouseId, productSizeId, dto.colorId);

      const existing = await tx.productSizeColor.findFirst({
        where: { productSizeId, colorId: dto.colorId },
      });
      const isNew = !existing;
      if (isNew) {
        await tx.productSizeColor.create({
          data: { productSizeId, colorId: dto.colorId },
        });
      }

      const stock = dto.stock ?? dto.initialStock;
      let newStock = oldStock;
      if (stock !== undefined && stock !== null) {
        newStock = Math.max(0, Math.trunc(stock));
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_productSizeId_colorId: {
              warehouseId,
              productSizeId,
              colorId: dto.colorId,
            },
          },
          update: { quantity: newStock },
          create: {
            warehouseId,
            productSizeId,
            colorId: dto.colorId,
            quantity: newStock,
          },
        });
      }

      await syncMasterBalanceToColorSum(tx, warehouseId, productSizeId);

      if (isNew || oldStock !== newStock) {
        await this.history.record(tx, {
          productId: ps.product.id,
          eventType: isNew ? 'COLOR_ADDED' : 'COLOR_STOCK_UPDATED',
          oldValues: isNew ? null : {
            stock: oldStock,
            color_name: color.description,
            product_size_id: productSizeId,
            size_id_ref: ps.sizeId,
            size: ps.size,
          },
          newValues: {
            stock: newStock,
            color_name: color.description,
            color_id: color.id,
            product_size_id: productSizeId,
            size_id_ref: ps.sizeId,
            size: ps.size,
          },
          createdById: user.id,
        });
      }

      return { message: 'Color agregado correctamente.' };
    });
  }

  // ── PATCH /v1/product-sizes/:productSizeId/colors/:colorId ────────────────
  @Patch(':productSizeId/colors/:colorId')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Actualizar stock de color en talla' })
  @ApiParam({ name: 'productSizeId' })
  @ApiParam({ name: 'colorId' })
  async updateColorStock(
    @Param('productSizeId') productSizeId: string,
    @Param('colorId') colorId: string,
    @Body() dto: UpdateColorStockDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.db.$transaction(async (tx) => {
      const ps = await tx.productSize.findFirst({
        where: { id: productSizeId, isDeleted: false },
        include: {
          product: { select: { id: true, warehouseId: true } },
          size: { select: { id: true, description: true } },
        },
      });
      if (!ps) throw new NotFoundException('Talla no encontrada.');

      const color = await tx.color.findFirst({
        where: { id: colorId, isDeleted: false },
        select: { id: true, description: true },
      });
      if (!color) throw new NotFoundException('Color no encontrado.');

      const warehouseId = ps.product.warehouseId ?? user.warehouseId;
      const oldStock = await readColorStock(tx, warehouseId, productSizeId, colorId);

      let psc = await tx.productSizeColor.findFirst({
        where: { productSizeId, colorId },
      });
      const isNew = !psc;
      if (isNew) {
        psc = await tx.productSizeColor.create({
          data: { productSizeId, colorId },
        });
      }

      let newStock = oldStock;
      if (dto.stock !== undefined) {
        newStock = Math.max(0, Math.trunc(dto.stock));
        await tx.inventoryBalance.upsert({
          where: {
            warehouseId_productSizeId_colorId: {
              warehouseId,
              productSizeId,
              colorId,
            },
          },
          update: { quantity: newStock },
          create: {
            productSizeId,
            colorId,
            warehouseId,
            quantity: newStock,
          },
        });
      }

      await syncMasterBalanceToColorSum(tx, warehouseId, productSizeId);

      if (isNew || oldStock !== newStock) {
        await this.history.record(tx, {
          productId: ps.product.id,
          eventType: isNew ? 'COLOR_ADDED' : 'COLOR_STOCK_UPDATED',
          oldValues: isNew ? null : {
            stock: oldStock,
            color_name: color.description,
            product_size_id: productSizeId,
            size_id_ref: ps.sizeId,
            size: ps.size,
          },
          newValues: {
            stock: newStock,
            color_name: color.description,
            color_id: color.id,
            product_size_id: productSizeId,
            size_id_ref: ps.sizeId,
            size: ps.size,
          },
          createdById: user.id,
        });
      }

      return { message: 'Stock actualizado correctamente.' };
    });
  }

  // ── DELETE /v1/product-sizes/:productSizeId/colors/:colorId ──────────────
  @Delete(':productSizeId/colors/:colorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Eliminar color de talla por productSizeId' })
  @ApiParam({ name: 'productSizeId' })
  @ApiParam({ name: 'colorId' })
  async removeColor(
    @Param('productSizeId') productSizeId: string,
    @Param('colorId') colorId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.db.$transaction(async (tx) => {
      const ps = await tx.productSize.findFirst({
        where: { id: productSizeId, isDeleted: false },
        include: {
          product: { select: { id: true, warehouseId: true } },
          size: { select: { id: true, description: true } },
        },
      });
      if (!ps) throw new NotFoundException('Talla no encontrada.');

      const color = await tx.color.findFirst({
        where: { id: colorId, isDeleted: false },
        select: { id: true, description: true },
      });
      if (!color) throw new NotFoundException('Color no encontrado.');

      const psc = await tx.productSizeColor.findFirst({
        where: { productSizeId, colorId },
      });
      if (!psc) throw new NotFoundException('Color no encontrado en esta talla.');

      const warehouseId = ps.product.warehouseId ?? user.warehouseId;
      const oldStock = await readColorStock(tx, warehouseId, productSizeId, colorId);

      await tx.productSizeColor.delete({ where: { id: psc.id } });

      const balance = await tx.inventoryBalance.findFirst({
        where: {
          warehouseId,
          productSizeId,
          colorId,
        },
      });
      if (balance) {
        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: { quantity: 0 },
        });
      }

      await syncMasterBalanceToColorSum(tx, warehouseId, productSizeId);

      await this.history.record(tx, {
        productId: ps.product.id,
        eventType: 'COLOR_REMOVED',
        oldValues: {
          stock: oldStock,
          color_name: color.description,
          color_id: color.id,
          product_size_id: productSizeId,
          size_id_ref: ps.sizeId,
          size: ps.size,
        },
        createdById: user.id,
      });
    });
  }
}
