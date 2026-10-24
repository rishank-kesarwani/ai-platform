import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('RedisService', () => {
  let service: RedisService;
  let mockConfigService: any;
  const MockedRedis = Redis as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect using connection URL directly when REDIS_URL is provided without depending on host/password keys', async () => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'redis.url') return 'redis://default:secret@redis.internal:6379';
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();

    expect(MockedRedis).toHaveBeenCalledWith(
      'redis://default:secret@redis.internal:6379',
      expect.objectContaining({
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      }),
    );
  });

  it('should connect using host and port credentials when REDIS_URL is not provided', async () => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'redis.url') return undefined;
        if (key === 'redis.host') return 'redis.custom.internal';
        if (key === 'redis.port') return 6380;
        if (key === 'redis.password') return 'auth_secret';
        if (key === 'redis.db') return 2;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();

    expect(MockedRedis).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'redis.custom.internal',
        port: 6380,
        password: 'auth_secret',
        db: 2,
        maxRetriesPerRequest: null,
      }),
    );
  });
});
