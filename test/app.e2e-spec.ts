import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HealthController } from '../src/health/health.controller';
import { RedisService } from '../src/ai/cache/redis.service';
import { VectorStoreFactory } from '../src/ai/vector-store/vector-store.factory';
import { getConnectionToken } from '@nestjs/mongoose';
 
const request = require('supertest');

describe('AI Platform Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockMongoConnection = { readyState: 1 };
    const mockRedisService = { ping: jest.fn().mockResolvedValue('PONG') };
    const mockVectorStore = { ping: jest.fn().mockResolvedValue(true) };
    const mockVectorStoreFactory = { getVectorStore: () => mockVectorStore };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getConnectionToken(), useValue: mockMongoConnection },
        { provide: RedisService, useValue: mockRedisService },
        { provide: VectorStoreFactory, useValue: mockVectorStoreFactory },
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

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('portfolio-ai-platform');
      });
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect((res: any) => {
        expect(res.body.status).toBe('up');
      });
  });

  it('/health/ready (GET)', () => {
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
