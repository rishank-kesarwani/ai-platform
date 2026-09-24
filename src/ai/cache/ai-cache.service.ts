import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RedisService } from './redis.service';
import { CACHE_PREFIXES } from '../../common/constants';

export interface CacheKeyParams {
  applicationId: string;
  tenantId: string;
  userId?: string;
  input: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

@Injectable()
export class AiCacheService {
  private readonly logger = new Logger(AiCacheService.name);
  private readonly enabled: boolean;
  private readonly defaultTtl: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('cache.enabled') ?? true;
    this.defaultTtl = this.configService.get<number>('cache.ttlSeconds') ?? 300;
  }

  generateKey(params: CacheKeyParams): string {
    const rawPayload = JSON.stringify({
      input: params.input,
      systemPrompt: params.systemPrompt || '',
      model: params.model || '',
      temperature: params.temperature ?? 0.7,
    });

    const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const userPart = params.userId ? params.userId : 'global';

    return `${CACHE_PREFIXES.AI_RESPONSE}:${params.applicationId}:${params.tenantId}:${userPart}:${hash}`;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const data = await this.redisService.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Failed to parse cache data for key ${key}: ${err.message}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.enabled) return;
    try {
      const ttl = ttlSeconds && ttlSeconds > 0 ? ttlSeconds : this.defaultTtl;
      await this.redisService.set(key, JSON.stringify(value), ttl);
    } catch (err: any) {
      this.logger.warn(`Failed to set cache data for key ${key}: ${err.message}`);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async getOrSet<T>(
    params: CacheKeyParams,
    factory: () => Promise<T>,
    ttlSeconds?: number,
    bypassCache = false,
  ): Promise<{ data: T; cached: boolean }> {
    if (!this.enabled || bypassCache) {
      const freshData = await factory();
      return { data: freshData, cached: false };
    }

    const key = this.generateKey(params);
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT for key: ${key}`);
      return { data: cached, cached: true };
    }

    this.logger.debug(`Cache MISS for key: ${key}`);
    const freshData = await factory();
    await this.set(key, freshData, ttlSeconds);
    return { data: freshData, cached: false };
  }
}
