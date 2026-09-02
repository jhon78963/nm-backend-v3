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

import { UpdateFooterDto } from './dto/update-footer.dto';
import { FooterService } from './footer.service';

@ApiTags('Ecommerce Footer')
@Controller('ecommerce/footer')
export class FooterController {
  constructor(private readonly footerService: FooterService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener configuración pública del footer del storefront' })
  getPublicFooter() {
    return this.footerService.getPublicFooter();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar configuración del footer (admin)' })
  upsertFooter(@Body() dto: UpdateFooterDto) {
    return this.footerService.upsertFooter(dto);
  }
}
