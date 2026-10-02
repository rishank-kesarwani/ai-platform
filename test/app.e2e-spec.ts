import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from '../src/health/health.controller';
import { RedisService } from '../src/ai/cache/redis.service';
import { VectorStoreFactory } from '../src/ai/vector-store/vector-store.factory';
import { ServiceAuthGuard } from '../src/common/guards/service-auth.guard';
import { ServiceAuthService } from '../src/auth/service-auth.service';
import { getConnectionToken } from '@nestjs/mongoose';
import configuration from '../src/config/configuration';
 
const request = require('supertest');

describe('AI Platform Service-to-Service Auth & Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.AI_PLATFORM_TRAVEL_API_KEY = 'e2e-travel-key';
    process.env.AI_PLATFORM_MOVIE_API_KEY = 'e2e-movie-key';
    process.env.AI_PLATFORM_SPORTS_API_KEY = 'e2e-sports-key';
    process.env.AI_PLATFORM_STUDY_API_KEY = 'e2e-study-key';
    process.env.AI_SERVICE_API_KEY = 'e2e-legacy-fallback-key';

    const mockMongoConnection = { readyState: 1 };
    const mockRedisService = { ping: jest.fn().mockResolvedValue('PONG') };
    const mockVectorStore = { ping: jest.fn().mockResolvedValue(true) };
    const mockVectorStoreFactory = { getVectorStore: () => mockVectorStore };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
      ],
      controllers: [HealthController],
      providers: [
        { provide: getConnectionToken(), useValue: mockMongoConnection },
        { provide: RedisService, useValue: mockRedisService },
        { provide: VectorStoreFactory, useValue: mockVectorStoreFactory },
        ServiceAuthService,
        {
          provide: APP_GUARD,
          useClass: ServiceAuthGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Public Endpoints', () => {
    it('/health (GET) - accessible without x-api-key', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('portfolio-ai-platform');
        });
    });

    it('/health/live (GET) - accessible without x-api-key', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('up');
        });
    });

    it('/health/ready (GET) - accessible without x-api-key', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.status).toBe('ready');
          expect(res.body.services.mongodb.status).toBe('up');
          expect(res.body.services.redis.status).toBe('up');
          expect(res.body.services.qdrant.status).toBe('up');
        });
    });
  });

  describe('Service Authentication Validation', () => {
    it('should validate travel key via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('e2e-travel-key');
      expect(res.isValid).toBe(true);
      expect(res.service).toBe('travel');
    });

    it('should validate movie key via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('e2e-movie-key');
      expect(res.isValid).toBe(true);
      expect(res.service).toBe('movie');
    });

    it('should validate sports key via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('e2e-sports-key');
      expect(res.isValid).toBe(true);
      expect(res.service).toBe('sports');
    });

    it('should validate study key via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('e2e-study-key');
      expect(res.isValid).toBe(true);
      expect(res.service).toBe('study');
    });

    it('should validate legacy fallback key via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('e2e-legacy-fallback-key');
      expect(res.isValid).toBe(true);
      expect(res.service).toBe('legacy-fallback');
    });

    it('should reject invalid keys via ServiceAuthService', () => {
      const authService = app.get<ServiceAuthService>(ServiceAuthService);
      const res = authService.validateKey('wrong-key');
      expect(res.isValid).toBe(false);
    });
  });
});
