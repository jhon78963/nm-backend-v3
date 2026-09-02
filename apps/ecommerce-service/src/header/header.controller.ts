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

import { UpdateHeaderDto } from './dto/update-header.dto';
import { HeaderService } from './header.service';

@ApiTags('Ecommerce Header')
@Controller('ecommerce/header')
export class HeaderController {
  constructor(private readonly headerService: HeaderService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener configuración pública del header del storefront' })
  getPublicHeader() {
    return this.headerService.getPublicHeader();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar configuración del header (admin)' })
  upsertHeader(@Body() dto: UpdateHeaderDto) {
    return this.headerService.upsertHeader(dto);
  }
}
