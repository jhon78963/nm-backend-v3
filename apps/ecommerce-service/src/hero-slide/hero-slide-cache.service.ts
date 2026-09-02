import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_HERO_SLIDE_CACHE_KEY } from './constants/hero-slide.defaults';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class HeroSlideCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(HeroSlideCacheService.name);
  private readonly ttlSeconds: number;
  private readonly memory = new Map<string, MemoryCacheEntry>();
  private redis: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>;
    del(key: string): Promise<number>;
    quit(): Promise<string>;
  } | null = null;

  constructor(private readonly config: ConfigService) {
    this.ttlSeconds = this.config.get<number>('HEADER_CACHE_TTL_SECONDS', 300);
    void this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.log('REDIS_URL not set — hero slide cache will use in-memory store');
      return;
    }

    try {
      const { default: Redis } = await import('ioredis');
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      await client.connect();
      this.redis = client;
      this.logger.log('Hero slide cache connected to Redis');
    } catch (error) {
      this.logger.warn(
        `Redis unavailable for hero slide cache — falling back to memory: ${(error as Error).message}`,
      );
    }
  }

  async get<T>(key: string = DEFAULT_HERO_SLIDE_CACHE_KEY): Promise<T | null> {
    if (this.redis) {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    }

    const entry = this.memory.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }

    return JSON.parse(entry.value) as T;
  }

  async set<T>(value: T, key: string = DEFAULT_HERO_SLIDE_CACHE_KEY): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.redis) {
      await this.redis.set(key, serialized, 'EX', this.ttlSeconds);
      return;
    }

    this.memory.set(key, {
      value: serialized,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async invalidate(key: string = DEFAULT_HERO_SLIDE_CACHE_KEY): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }

    this.memory.delete(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
