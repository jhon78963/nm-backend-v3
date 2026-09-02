import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

import { EcommerceMediaService } from './ecommerce-media.service';
import { DeleteEcommerceMediaBulkDto } from './dto/delete-ecommerce-media-bulk.dto';
import { ListEcommerceMediaQueryDto } from './dto/list-ecommerce-media-query.dto';

@ApiTags('Ecommerce Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ecommerce/media')
export class EcommerceMediaController {
  constructor(private readonly mediaService: EcommerceMediaService) {}

  @Get()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Listar biblioteca multimedia del ecommerce' })
  findAll(@Query() query: ListEcommerceMediaQueryDto) {
    return this.mediaService.findAll(query);
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Subir archivos a la biblioteca multimedia' })
  @ApiConsumes('multipart/form-data')
  upload(@Req() req: FastifyRequest, @CurrentUser() user: AuthenticatedUser) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }
    return this.mediaService.upload(req, user.id);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Eliminar varios archivos de la biblioteca' })
  removeMany(@Body() dto: DeleteEcommerceMediaBulkDto) {
    return this.mediaService.removeMany(dto.ids);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.OK)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Eliminar un archivo de la biblioteca' })
  remove(@Param('mediaId') mediaId: string) {
    return this.mediaService.remove(mediaId);
  }
}
