import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { StorageClientService } from '@app/storage-client';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@app/storage';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';
import { SUPER_ADMIN_ROLE } from '@app/common/auth/tenant-admin-permissions';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';

@Injectable()
export class TenantLogoService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageClient: StorageClientService,
  ) {}

  async upload(req: FastifyRequest, tenantId: string, actor: AuthenticatedUser) {
    if (!actor.roles.includes(SUPER_ADMIN_ROLE) && actor.tenantId !== tenantId) {
      throw new ForbiddenException('No tiene permiso para modificar este tenant.');
    }

    const setting = await this.db.tenantSetting.findUnique({ where: { tenantId } });
    const tenant = await this.db.tenant.findFirst({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

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
          throw new PayloadTooLargeException('El logo excede el tamaño máximo de 5 MB.');
        }
        chunks.push(chunk as Buffer);
      }

      const buffer = Buffer.concat(chunks);
      stored = await this.storageClient.upload(buffer, mimeType, part.filename, 'tenants');
      break;
    }

    if (!stored) throw new BadRequestException('No se encontró ningún archivo.');

    // Borrar logo anterior si existe
    if (setting?.logoUrl) {
      const old = this.extractPath(setting.logoUrl);
      if (old) await this.storageClient.delete(old).catch(() => undefined);
    }

    await this.db.tenantSetting.upsert({
      where: { tenantId },
      create: { tenantId, logoUrl: stored.url },
      update: { logoUrl: stored.url },
    });

    return { logoUrl: stored.url };
  }

  private extractPath(url: string): string | null {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/storage\/files\/(.+)$/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
