import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import type { FastifyRequest } from 'fastify';
import { UploadService } from './upload.service';

@ApiTags('Storage — Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'storage/upload', version: '1' })
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Subir uno o más archivos (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  async upload(@Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException('La petición debe ser multipart/form-data.');
    }

    return this.uploadService.handleMultipart(req);
  }
}
