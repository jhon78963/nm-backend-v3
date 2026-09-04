import { ConfigService } from '@nestjs/config';
import type { JobsOptions } from 'bullmq';

function readNumber(config: ConfigService, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value !== undefined && value !== '') {
      return Number(value);
    }
  }

  return fallback;
}

function readBoolean(config: ConfigService, keys: string[], fallback: boolean): boolean {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value !== undefined && value !== '') {
      return value !== 'false';
    }
  }

  return fallback;
}

export function resolveQueueConfigPrefix(configPrefix?: string): string {
  return configPrefix?.trim().toUpperCase() || 'QUEUE';
}

export function isQueueEnabled(config: ConfigService, configPrefix?: string): boolean {
  const prefix = resolveQueueConfigPrefix(configPrefix);

  return readBoolean(
    config,
    [`${prefix}_QUEUE_ENABLED`, 'QUEUE_ENABLED'],
    true,
  );
}

export function resolveQueueConcurrency(config: ConfigService, configPrefix?: string): number {
  const prefix = resolveQueueConfigPrefix(configPrefix);

  return readNumber(
    config,
    [`${prefix}_QUEUE_CONCURRENCY`, 'QUEUE_CONCURRENCY'],
    5,
  );
}

/** Para decoradores @Processor donde no hay inyección de ConfigService. */
export function readQueueConcurrencyFromEnv(configPrefix?: string): number {
  const prefix = resolveQueueConfigPrefix(configPrefix);
  const keys = [`${prefix}_QUEUE_CONCURRENCY`, 'QUEUE_CONCURRENCY'];

  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== '') {
      return Number(value);
    }
  }

  return 5;
}

export function resolveDefaultJobOptions(
  config: ConfigService,
  configPrefix?: string,
  overrides: JobsOptions = {},
): JobsOptions {
  const prefix = resolveQueueConfigPrefix(configPrefix);

  return {
    attempts: readNumber(config, [`${prefix}_QUEUE_ATTEMPTS`, 'QUEUE_ATTEMPTS'], 3),
    backoff: {
      type: 'exponential',
      delay: readNumber(config, [`${prefix}_QUEUE_BACKOFF_MS`, 'QUEUE_BACKOFF_MS'], 5000),
    },
    removeOnComplete: readNumber(
      config,
      [`${prefix}_QUEUE_REMOVE_ON_COMPLETE`, 'QUEUE_REMOVE_ON_COMPLETE'],
      200,
    ),
    removeOnFail: readNumber(
      config,
      [`${prefix}_QUEUE_REMOVE_ON_FAIL`, 'QUEUE_REMOVE_ON_FAIL'],
      500,
    ),
    ...overrides,
  };
}
