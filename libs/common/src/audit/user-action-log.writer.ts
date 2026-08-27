import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '@app/database';
import { v4 as uuidv4 } from 'uuid';

export interface WriteActionLogInput {
  action: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userId: string;
  tenantId?: string | null;
  warehouseId?: string | null;
}

@Injectable()
export class UserActionLogWriter {
  private readonly logger = new Logger(UserActionLogWriter.name);

  constructor(private readonly db: DatabaseService) {}

  async logSafely(input: WriteActionLogInput): Promise<void> {
    try {
      await this.db.userActionLog.create({
        data: {
          id: uuidv4(),
          action: input.action.slice(0, 100),
          description: input.description ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          ipAddress: input.ipAddress ?? null,
          userId: input.userId,
          tenantId: input.tenantId ?? null,
          warehouseId: input.warehouseId ?? null,
        },
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo registrar auditoría (${input.action}): ${(err as Error).message}`,
      );
    }
  }
}
