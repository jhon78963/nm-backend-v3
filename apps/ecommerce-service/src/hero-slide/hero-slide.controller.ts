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

import { UpdateHeroSlidesDto } from './dto/update-hero-slides.dto';
import { HeroSlideService } from './hero-slide.service';

@ApiTags('Ecommerce Hero Slides')
@Controller('ecommerce/hero-slides')
export class HeroSlideController {
  constructor(private readonly heroSlideService: HeroSlideService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener slides públicos del hero del home' })
  getPublicHeroSlides() {
    return this.heroSlideService.getPublicHeroSlides();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar slides del hero del home (admin)' })
  upsertHeroSlides(@Body() dto: UpdateHeroSlidesDto) {
    return this.heroSlideService.upsertHeroSlides(dto);
  }
}
