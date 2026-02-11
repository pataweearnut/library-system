import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const BOOKS_LIST_PREFIX = 'books:list:';
const BOOKS_SEARCH_PREFIX = 'books:search:';
const DEFAULT_TTL_SEC = 60;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (url) {
      this.client = new Redis(url, { maxRetriesPerRequest: null });
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(
    key: string,
    value: string,
    ttlSec = DEFAULT_TTL_SEC,
  ): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSec, value);
    } catch {
      // ignore Redis errors; app continues without cache
    }
  }

  /** Invalidate all cached books list and search (call after create/update book). */
  async invalidateBooksCache(): Promise<void> {
    if (!this.client) return;
    try {
      const [listKeys, searchKeys] = await Promise.all([
        this.client.keys(`${BOOKS_LIST_PREFIX}*`),
        this.client.keys(`${BOOKS_SEARCH_PREFIX}*`),
      ]);
      const keys = [...listKeys, ...searchKeys];
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // ignore
    }
  }
}
