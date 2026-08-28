import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  STORAGE_PROVIDER,
  StorageContext,
  StorageProvider,
  StoredFile,
} from '@app/storage';
import type { FastifyRequest } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';

const VALID_CONTEXTS = new Set<string>([
  'products',
  'avatars',
  'vouchers',
  'tenants',
  'general',
]);

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async handleMultipart(req: FastifyRequest): Promise<{
    success: boolean;
    files: StoredFile[];
  }> {
    const parts = req.parts();
    let context: StorageContext = 'general';
    const results: StoredFile[] = [];

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'context') {
        const val = (part as { value: string }).value;
        if (VALID_CONTEXTS.has(val)) {
          context = val as StorageContext;
        }
        continue;
      }

      if (part.type === 'file') {
        const file = part as MultipartFile;
        const chunks: Buffer[] = [];
        let size = 0;

        for await (const chunk of file.file) {
          size += chunk.length;
          if (size > MAX_FILE_SIZE_BYTES) {
            throw new PayloadTooLargeException(
              `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
            );
          }
          chunks.push(chunk as Buffer);
        }

        const mimeType = file.mimetype;
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          throw new BadRequestException(
            `Tipo MIME no permitido: ${mimeType}. Permitidos: JPEG, PNG, WebP, PDF.`,
          );
        }

        const buffer = Buffer.concat(chunks);
        const stored = await this.storage.upload({
          buffer,
          mimeType,
          originalName: file.filename,
          context,
        });

        results.push(stored);
        this.logger.log(`Uploaded ${stored.path}`);
      }
    }

    if (results.length === 0) {
      throw new BadRequestException('No se encontraron archivos en la petición.');
    }

    return { success: true, files: results };
  }
}
