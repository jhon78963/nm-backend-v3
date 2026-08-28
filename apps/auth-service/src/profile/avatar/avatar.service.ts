import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { StorageClientService } from '@app/storage-client';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@app/storage';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';

@Injectable()
export class AvatarService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageClient: StorageClientService,
  ) {}

  async upload(req: FastifyRequest, userId: string) {
    const user = await this.db.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const parts = req.parts();
    let stored: { path: string; url: string } | null = null;

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      const mimeType = part.mimetype;
      if (!ALLOWED_MIME_TYPES.has(mimeType) || mimeType === 'application/pdf') {
        throw new BadRequestException('Solo se permiten imágenes (JPEG, PNG, WebP).');
      }

      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of part.file) {
        size += chunk.length;
        if (size > MAX_FILE_SIZE_BYTES) {
          throw new PayloadTooLargeException('La imagen excede el tamaño máximo de 5 MB.');
        }
        chunks.push(chunk as Buffer);
      }

      const buffer = Buffer.concat(chunks);
      stored = await this.storageClient.upload(buffer, mimeType, part.filename, 'avatars');
      break;
    }

    if (!stored) throw new BadRequestException('No se encontró ningún archivo.');

    // Si tenía avatar anterior, borrarlo
    if (user.profilePicture) {
      const old = this.extractPath(user.profilePicture);
      if (old) await this.storageClient.delete(old).catch(() => undefined);
    }

    await this.db.user.update({
      where: { id: userId },
      data: { profilePicture: stored.url },
    });

    return { profilePicture: stored.url };
  }

  async remove(userId: string) {
    const user = await this.db.user.findFirst({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    if (user.profilePicture) {
      const path = this.extractPath(user.profilePicture);
      if (path) await this.storageClient.delete(path).catch(() => undefined);
    }

    await this.db.user.update({
      where: { id: userId },
      data: { profilePicture: null },
    });

    return { message: 'Foto de perfil eliminada.' };
  }

  private extractPath(url: string): string | null {
    try {
      const parsed = new URL(url);
      // /api/v1/storage/files/avatars/uuid.jpg → avatars/uuid.jpg
      const match = parsed.pathname.match(/\/storage\/files\/(.+)$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
