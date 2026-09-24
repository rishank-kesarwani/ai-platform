import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiCacheService } from './ai-cache.service';
import { RedisService } from './redis.service';

describe('AiCacheService', () => {
  let cacheService: AiCacheService;
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    const cacheMap = new Map<string, string>();
    mockRedisService = {
      get: jest.fn(async (key: string) => cacheMap.get(key) || null),
      set: jest.fn(async (key: string, val: string) => {
        cacheMap.set(key, val);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => {
        cacheMap.delete(key);
        return 1;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCacheService,
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'cache.enabled') return true;
              if (key === 'cache.ttlSeconds') return 300;
              return null;
            }),
          },
        },
      ],
    }).compile();

    cacheService = module.get<AiCacheService>(AiCacheService);
  });

  it('should generate scoped cache key and return cache miss on initial query', async () => {
    const params = {
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-1',
      input: 'hotels in tokyo',
    };

    const factory = jest.fn().mockImplementation(async () => ({ answer: 'Hotel Shibuya' }));
    const result1 = await cacheService.getOrSet<{ answer: string }>(params, factory);

    expect(result1.cached).toBe(false);
    expect(result1.data.answer).toBe('Hotel Shibuya');
    expect(factory).toHaveBeenCalledTimes(1);

    // Second call should HIT the cache
    const result2 = await cacheService.getOrSet<{ answer: string }>(params, factory);
    expect(result2.cached).toBe(true);
    expect(result2.data.answer).toBe('Hotel Shibuya');
    expect(factory).toHaveBeenCalledTimes(1); // not called again
  });

  it('should isolate caches across different tenants or users', async () => {
    const user1Params = {
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-1',
      input: 'my itinerary',
    };

    const user2Params = {
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-2',
      input: 'my itinerary',
    };

    const key1 = cacheService.generateKey(user1Params);
    const key2 = cacheService.generateKey(user2Params);

    expect(key1).not.toEqual(key2);
  });
});
