import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@app/common/decorators/public.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';

import { UpdateShopCollectionsDto } from './dto/update-shop-collections.dto';
import { ShopCollectionsService } from './shop-collections.service';

@ApiTags('Ecommerce Shop Collections')
@Controller('ecommerce/shop/collections')
export class ShopCollectionsController {
  constructor(private readonly shopCollectionsService: ShopCollectionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar colecciones de la tienda (PLP)' })
  getPublicCollections() {
    return this.shopCollectionsService.getPublicCollections();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar colecciones de la tienda (admin)' })
  upsertCollections(@Body() dto: UpdateShopCollectionsDto) {
    return this.shopCollectionsService.upsertCollections(dto);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Obtener una colección por slug' })
  getCollectionBySlug(@Param('slug') slug: string) {
    return this.shopCollectionsService.getCollectionBySlugOrThrow(slug);
  }
}
