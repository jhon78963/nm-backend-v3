import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';
import type { StorageProvider } from '../interfaces/storage-provider.interface';
import type { StoredFile, UploadInput } from '../types/storage.types';

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

@Injectable()
export class LocalStorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly root: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.root    = config.get<string>('STORAGE_LOCAL_ROOT', '/data/uploads');
    this.baseUrl = config.get<string>(
      'STORAGE_PUBLIC_BASE_URL',
      'http://localhost:3000/api/v1/storage/files',
    );
  }

  onModuleInit() {
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true });
    }
    this.logger.log(`LocalStorageProvider ready → ${this.root}`);
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const ext      = EXTENSION_MAP[input.mimeType] ?? path.extname(input.originalName).toLowerCase();
    const filename = `${crypto.randomUUID()}${ext}`;
    const dir      = path.join(this.root, input.context);
    const fullPath = path.join(dir, filename);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, input.buffer);

    const logicalPath = `${input.context}/${filename}`;
    this.logger.log(`Stored ${logicalPath} (${input.buffer.length} bytes)`);

    return {
      path:     logicalPath,
      url:      this.getPublicUrl(logicalPath),
      name:     filename,
      mimeType: input.mimeType,
      size:     input.buffer.length,
    };
  }

  async delete(logicalPath: string): Promise<void> {
    const fullPath = this.resolveSafePath(logicalPath);
    if (!fullPath) return;

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted ${logicalPath}`);
    }
  }

  async getReadStream(logicalPath: string): Promise<Readable> {
    const fullPath = this.resolveSafePath(logicalPath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      throw new NotFoundException('Archivo no encontrado.');
    }

    return fs.createReadStream(fullPath);
  }

  getPublicUrl(logicalPath: string): string {
    return `${this.baseUrl}/${logicalPath}`;
  }

  /** Resuelve la ruta absoluta validando que quede dentro del root (path traversal). */
  private resolveSafePath(logicalPath: string): string | null {
    const normalized = logicalPath.replace(/^\/+/, '').replace(/\.\./g, '');
    const resolved   = path.resolve(path.join(this.root, normalized));

    if (!resolved.startsWith(path.resolve(this.root))) {
      this.logger.warn(`Path traversal bloqueado: ${logicalPath}`);
      return null;
    }

    return resolved;
  }
}
