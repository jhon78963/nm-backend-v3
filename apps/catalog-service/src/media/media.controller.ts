import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { MediaService } from './media.service';

@ApiTags('Product Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'products/:productId/media', version: '1' })
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar imágenes de un producto' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  findAll(@Param('productId') productId: string) {
    return this.mediaService.findAll(productId);
  }

  @Post()
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Subir imagen(es) para un producto (max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  upload(
    @Param('productId') productId: string,
    @Req() req: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }
    return this.mediaService.upload(req, productId, user.id);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.OK)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Eliminar una imagen de producto' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  @ApiParam({ name: 'mediaId', description: 'UUID del registro de media' })
  remove(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.mediaService.remove(productId, mediaId);
  }

  @Post(':mediaId/cover')
  @Roles('Admin', 'Super Admin', 'Vendedora')
  @ApiOperation({ summary: 'Marcar imagen como portada del producto' })
  @ApiParam({ name: 'productId', description: 'UUID del producto' })
  @ApiParam({ name: 'mediaId', description: 'UUID del registro de media' })
  setCover(
    @Param('productId') productId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.mediaService.setCover(productId, mediaId);
  }
}
