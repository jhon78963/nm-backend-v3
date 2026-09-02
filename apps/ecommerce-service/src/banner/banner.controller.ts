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

import { BannerService } from './banner.service';
import { UpdateBannersDto } from './dto/update-banners.dto';
import { UpdateOfferBannerDto } from './dto/update-offer-banner.dto';

@ApiTags('Ecommerce Banners')
@Controller('ecommerce/banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener banners públicos del home' })
  getPublicBanners() {
    return this.bannerService.getPublicBanners();
  }

  @Get('offer')
  @Public()
  @ApiOperation({ summary: 'Obtener banner promocional ancho completo del home' })
  getPublicOfferBanner() {
    return this.bannerService.getPublicOfferBanner();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar banners del home (admin)' })
  upsertBanners(@Body() dto: UpdateBannersDto) {
    return this.bannerService.upsertBanners(dto);
  }

  @Put('offer/admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar banner promocional ancho completo (admin)' })
  upsertOfferBanner(@Body() dto: UpdateOfferBannerDto) {
    return this.bannerService.upsertOfferBanner(dto);
  }
}
