import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { buildRedisConnection } from './queue-redis.config';
import type { RegisterQueueOptions } from './queue-registration.types';

@Module({})
export class QueueManagerModule {
  /**
   * Configura BullMQ de forma global para el microservicio.
   * BullMQ persiste los jobs en Redis; los workers los leen y procesan en segundo plano.
   */
  static forRoot(): DynamicModule {
    return {
      module: QueueManagerModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            connection: buildRedisConnection(config),
          }),
        }),
      ],
      exports: [BullModule],
    };
  }

  /** Registra una o más colas sobre la conexión Redis global. */
  static registerQueues(...queues: Array<string | RegisterQueueOptions>): DynamicModule {
    const normalized = queues.map((queue) =>
      typeof queue === 'string' ? { name: queue } : queue,
    );

    return {
      module: QueueManagerModule,
      imports: normalized.map((queue) =>
        BullModule.registerQueue({
          name: queue.name,
          ...queue.queueOptions,
          defaultJobOptions: queue.defaultJobOptions,
        }),
      ),
      exports: [BullModule],
    };
  }
}
