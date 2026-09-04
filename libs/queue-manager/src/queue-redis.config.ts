import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

export function buildRedisConnection(config: ConfigService): ConnectionOptions {
  const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
  const connectTimeout = Number(config.get<string>('REDIS_CONNECT_TIMEOUT_MS', '5000'));

  return {
    url,
    connectTimeout: Number.isFinite(connectTimeout) ? connectTimeout : 5000,
    maxRetriesPerRequest: null,
  };
}
