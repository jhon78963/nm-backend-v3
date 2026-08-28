import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import type { Readable } from 'stream';
import type { StorageProvider } from '../interfaces/storage-provider.interface';
import type { StoredFile, UploadInput } from '../types/storage.types';

/**
 * FirebaseStorageProvider — Stub.
 *
 * Instalar cuando Firebase esté listo:
 *   npm install firebase-admin
 *
 * Implementar:
 *   - upload()        → bucket.file(path).save(buffer)
 *   - delete()        → bucket.file(path).delete()
 *   - getReadStream() → bucket.file(path).createReadStream()
 *   - getPublicUrl()  → signed URL con expiración o URL pública del bucket
 *
 * Activar:
 *   STORAGE_DRIVER=firebase en .env
 */
@Injectable()
export class FirebaseStorageProvider implements StorageProvider {
  private readonly logger = new Logger(FirebaseStorageProvider.name);

  constructor() {
    this.logger.warn(
      'FirebaseStorageProvider no está implementado. Configura STORAGE_DRIVER=local o implementa este provider.',
    );
  }

  upload(_input: UploadInput): Promise<StoredFile> {
    throw new NotImplementedException('Firebase Storage no está configurado aún.');
  }

  delete(_path: string): Promise<void> {
    throw new NotImplementedException('Firebase Storage no está configurado aún.');
  }

  getReadStream(_path: string): Promise<Readable> {
    throw new NotImplementedException('Firebase Storage no está configurado aún.');
  }

  getPublicUrl(_path: string): string {
    throw new NotImplementedException('Firebase Storage no está configurado aún.');
  }
}
