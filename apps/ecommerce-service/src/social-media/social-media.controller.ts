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

import { UpdateSocialMediaDto } from './dto/update-social-media.dto';
import { SocialMediaService } from './social-media.service';

@ApiTags('Ecommerce Home Social Media')
@Controller('ecommerce/home/social-media')
export class SocialMediaController {
  constructor(private readonly socialMediaService: SocialMediaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener sección de redes sociales del home' })
  getPublicSocialMedia() {
    return this.socialMediaService.getPublicSocialMedia();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar sección de redes sociales del home (admin)' })
  upsertSocialMedia(@Body() dto: UpdateSocialMediaDto) {
    return this.socialMediaService.upsertSocialMedia(dto);
  }
}
