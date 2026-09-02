import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';

import { PublicProductBySlugParamsDto, PublicProductBySlugQueryDto } from './dto/public-product-by-slug.dto';
import { PublicProductsQueryDto } from './dto/public-products-query.dto';
import { EcommerceProductsService } from './ecommerce-products.service';

@ApiTags('Ecommerce Products')
@Controller('ecommerce/products')
export class EcommerceProductsController {
  constructor(private readonly ecommerceProductsService: EcommerceProductsService) {}

  @Get('public')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ publicProducts: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obtener productos públicos del catálogo para el storefront' })
  getPublicProducts(@Query() query: PublicProductsQueryDto) {
    return this.ecommerceProductsService.getPublicProducts(query);
  }

  @Get('public/by-slug/:slug')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ publicProducts: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Obtener un producto público por slug SEO' })
  getPublicProductBySlug(
    @Param() params: PublicProductBySlugParamsDto,
    @Query() query: PublicProductBySlugQueryDto,
  ) {
    return this.ecommerceProductsService.getPublicProductBySlug(
      params.slug,
      query.warehouseId,
    );
  }
}
