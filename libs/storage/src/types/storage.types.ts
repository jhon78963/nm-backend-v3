export type StorageContext =
  | 'products'
  | 'avatars'
  | 'vouchers'
  | 'tenants'
  | 'general'
  | 'ecommerce';

export interface StoredFile {
  /** Ruta lógica relativa: "products/uuid.webp" */
  path: string;
  /** URL pública o firmada lista para guardar en Postgres */
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

export interface UploadInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  context: StorageContext;
}

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
