import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';

import { StoreSearchQueryDto } from './dto/store-search-query.dto';
import { StoreSearchService } from './store-search.service';

@ApiTags('Ecommerce Search')
@Controller('ecommerce/search')
export class StoreSearchController {
  constructor(private readonly storeSearchService: StoreSearchService) {}

  @Get()
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ publicProducts: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Búsqueda pública de productos y colecciones para el storefront' })
  search(@Query() query: StoreSearchQueryDto) {
    return this.storeSearchService.search(query);
  }
}
