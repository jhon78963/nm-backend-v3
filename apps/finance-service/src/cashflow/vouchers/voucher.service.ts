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

const MAX_VOUCHERS_PER_MOVEMENT = 5;

@Injectable()
export class VoucherService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageClient: StorageClientService,
  ) {}

  async upload(req: FastifyRequest, movementId: string) {
    const movement = await this.db.cashMovement.findFirst({
      where: { id: movementId, isDeleted: false },
      include: { vouchers: true },
    });
    if (!movement) throw new NotFoundException('Movimiento de caja no encontrado.');

    const current = movement.vouchers.length;
    if (current >= MAX_VOUCHERS_PER_MOVEMENT) {
      throw new BadRequestException(
        `El movimiento ya tiene el máximo de ${MAX_VOUCHERS_PER_MOVEMENT} comprobantes.`,
      );
    }

    const parts = req.parts();
    const uploaded: object[] = [];
    let fileCount = 0;

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      fileCount++;
      if (current + fileCount > MAX_VOUCHERS_PER_MOVEMENT) {
        for await (const _ of part.file) { /* drain */ }
        continue;
      }

      const mimeType = part.mimetype;
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new BadRequestException(`Tipo de archivo no permitido: ${mimeType}`);
      }

      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of part.file) {
        size += chunk.length;
        if (size > MAX_FILE_SIZE_BYTES) {
          throw new PayloadTooLargeException('Un archivo excede el límite de 5 MB.');
        }
        chunks.push(chunk as Buffer);
      }

      const buffer = Buffer.concat(chunks);
      const stored = await this.storageClient.upload(
        buffer,
        mimeType,
        part.filename,
        'vouchers',
      );

      const voucher = await this.db.cashMovementVoucher.create({
        data: {
          cashMovementId: movementId,
          voucherPath: stored.path,
          voucherUrl: stored.url,
          mimeType: stored.mimeType,
          name: stored.name,
          sortOrder: current + fileCount - 1,
        },
      });
      uploaded.push(voucher);
    }

    if (uploaded.length === 0) {
      throw new BadRequestException('No se encontraron archivos válidos para subir.');
    }

    return { uploaded };
  }

  async remove(movementId: string, voucherId: string) {
    const voucher = await this.db.cashMovementVoucher.findFirst({
      where: { id: voucherId, cashMovementId: movementId },
    });
    if (!voucher) throw new NotFoundException('Comprobante no encontrado.');

    await this.storageClient.delete(voucher.voucherPath).catch(() => undefined);
    await this.db.cashMovementVoucher.delete({ where: { id: voucherId } });

    return { message: 'Comprobante eliminado.' };
  }
}
