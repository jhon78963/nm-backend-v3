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

import { CollectionsService } from './collections.service';
import { UpdateCollectionsDto } from './dto/update-collections.dto';

@ApiTags('Ecommerce Home Collections')
@Controller('ecommerce/home/collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener colecciones de productos del home' })
  getPublicCollections() {
    return this.collectionsService.getPublicCollections();
  }

  @Put('admin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Crear o actualizar colecciones del home (admin)' })
  upsertCollections(@Body() dto: UpdateCollectionsDto) {
    return this.collectionsService.upsertCollections(dto);
  }
}
