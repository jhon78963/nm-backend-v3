import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

export function buildRedisConnection(config: ConfigService): ConnectionOptions {
  const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');

  return { url };
}
