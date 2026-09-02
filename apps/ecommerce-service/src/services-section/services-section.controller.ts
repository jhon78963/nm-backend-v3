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

import { UpdateServicesDto } from './dto/update-services.dto';
import { ServicesSectionService } from './services-section.service';

@ApiTags('Ecommerce Home Services')
@Controller('ecommerce/home/services')
export class ServicesSectionController {
  constructor(private readonly servicesSectionService: ServicesSectionService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener sección de servicios/beneficios del home' })
  getPublicServices() {
    return this.servicesSectionService.getPublicServices();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar sección de servicios del home (admin)' })
  upsertServices(@Body() dto: UpdateServicesDto) {
    return this.servicesSectionService.upsertServices(dto);
  }
}
