import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CACHE_PREFIXES } from '../../common/constants';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }
    return this.client.ping();
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err: any) {
      this.logger.warn(`Failed to get redis key "${key}": ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        return await this.client.set(key, value, 'EX', ttlSeconds);
      }
      return await this.client.set(key, value);
    } catch (err: any) {
      this.logger.warn(`Failed to set redis key "${key}": ${err.message}`);
      return null;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (err: any) {
      this.logger.warn(`Failed to delete redis key "${key}": ${err.message}`);
      return 0;
    }
  }

  async acquireLock(
    resource: string,
    ttlSeconds = 30,
  ): Promise<{ acquired: boolean; release: () => Promise<void> }> {
    const lockKey = `${CACHE_PREFIXES.LOCK}:${resource}`;
    const token = Math.random().toString(36).substring(2);
    try {
      const result = await this.client.set(lockKey, token, 'EX', ttlSeconds, 'NX');
      const acquired = result === 'OK';

      const release = async () => {
        if (!acquired) return;
        try {
          // Lua script to safely release lock only if token matches
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await this.client.eval(script, 1, lockKey, token);
        } catch (err: any) {
          this.logger.warn(`Failed to release lock "${lockKey}": ${err.message}`);
        }
      };

      return { acquired, release };
    } catch (err: any) {
      this.logger.warn(`Error acquiring lock "${lockKey}": ${err.message}`);
      return { acquired: false, release: async () => {} };
    }
  }
}
