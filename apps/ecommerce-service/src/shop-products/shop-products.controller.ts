import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';

import { ShopProductsQueryDto } from './dto/shop-products-query.dto';
import { ShopProductsService } from './shop-products.service';

@ApiTags('Ecommerce Shop Products')
@Controller('ecommerce/shop/products')
export class ShopProductsController {
  constructor(private readonly shopProductsService: ShopProductsService) {}

  @Get()
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ publicProducts: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Listar productos de una colección con filtros y facetas',
  })
  getShopProducts(@Query() query: ShopProductsQueryDto) {
    return this.shopProductsService.getShopProducts(query);
  }
}
