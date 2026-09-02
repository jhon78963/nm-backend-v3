import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@app/common/decorators/public.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

import { CategoryProductsService } from './category-products.service';
import { UpdateCategoryProductsDto } from './dto/update-category-products.dto';

@ApiTags('Ecommerce Home Category Products')
@Controller('ecommerce/home/category-products')
export class CategoryProductsController {
  constructor(private readonly categoryProductsService: CategoryProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener sección de productos por categoría del home' })
  getPublicCategoryProducts() {
    return this.categoryProductsService.getPublicCategoryProducts();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar sección category-products del home (admin)' })
  upsertCategoryProducts(@Body() dto: UpdateCategoryProductsDto) {
    return this.categoryProductsService.upsertCategoryProducts(dto);
  }
}
