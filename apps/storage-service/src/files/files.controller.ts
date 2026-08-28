import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { STORAGE_PROVIDER, StorageContext, StorageProvider } from '@app/storage';
import type { FastifyReply } from 'fastify';
import { Res } from '@nestjs/common';
import { StorageServiceKeyGuard } from '../guards/storage-service-key.guard';

const VALID_CONTEXTS = new Set<StorageContext>([
  'products',
  'avatars',
  'vouchers',
  'tenants',
  'general',
]);

@ApiTags('Storage — Files')
@Controller({ path: 'storage/files', version: '1' })
export class FilesController {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  @Get(':context/:filename')
  @ApiOperation({ summary: 'Descargar/servir un archivo almacenado' })
  async serve(
    @Param('context') context: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    if (!VALID_CONTEXTS.has(context as StorageContext)) {
      throw new BadRequestException('Contexto inválido.');
    }

    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Nombre de archivo inválido.');
    }

    const logicalPath = `${context}/${filename}`;
    const stream = await this.storage.getReadStream(logicalPath);

    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      pdf: 'application/pdf',
    };
    const contentType = mimeMap[ext] ?? 'application/octet-stream';

    void reply.header('content-type', contentType).send(stream);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @UseGuards(StorageServiceKeyGuard)
  @ApiOperation({ summary: 'Eliminar un archivo por su ruta lógica' })
  async remove(@Body() body: { path: string }) {
    if (!body?.path) {
      throw new BadRequestException('El campo "path" es requerido.');
    }

    await this.storage.delete(body.path);
    return { success: true };
  }
}
