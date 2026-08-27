import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * DatabaseService — Wrapper del cliente Prisma.
 * Equivale a la clase DB:: / Eloquent de Laravel con lifecycle hooks.
 * Al ser @Global() en DatabaseModule, cualquier servicio puede inyectarlo
 * sin importar DatabaseModule explícitamente en cada feature module.
 */
@Injectable()
export class DatabaseService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida via Prisma.');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
