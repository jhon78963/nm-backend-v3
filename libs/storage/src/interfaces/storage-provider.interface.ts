import type { Readable } from 'stream';
import type { StoredFile, UploadInput } from '../types/storage.types';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/**
 * Contrato único para todos los backends de almacenamiento.
 * Cambiar de disco local a Firebase Storage = nueva implementación, misma interfaz.
 */
export interface StorageProvider {
  /**
   * Sube un archivo y devuelve la metadata persistible.
   * El `path` retornado es la ruta lógica que se guarda en Postgres.
   */
  upload(input: UploadInput): Promise<StoredFile>;

  /**
   * Elimina el archivo identificado por su ruta lógica.
   * No lanza error si el archivo no existe.
   */
  delete(path: string): Promise<void>;

  /**
   * Stream de lectura del archivo.
   * Local: lee del disco. Firebase: descarga del bucket.
   */
  getReadStream(path: string): Promise<Readable>;

  /**
   * URL completa lista para entregar al cliente.
   * Local: URL del gateway. Firebase: signed URL o CDN.
   */
  getPublicUrl(path: string): string;
}
