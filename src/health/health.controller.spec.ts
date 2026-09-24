import { HealthController } from './health.controller';
import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let mockMongoConnection: any;
  let mockRedisService: any;
  let mockVectorStoreFactory: any;
  let mockVectorStore: any;

  beforeEach(() => {
    mockMongoConnection = { readyState: 1 };
    mockRedisService = { ping: jest.fn().mockResolvedValue('PONG') };
    mockVectorStore = { ping: jest.fn().mockResolvedValue(true) };
    mockVectorStoreFactory = { getVectorStore: () => mockVectorStore };

    controller = new HealthController(
      mockMongoConnection,
      mockRedisService,
      mockVectorStoreFactory,
    );
  });

  it('should return basic health ping', () => {
    const res = controller.ping();
    expect(res.status).toBe('ok');
    expect(res.service).toBe('portfolio-ai-platform');
  });

  it('should return 200 ready when all services are up', async () => {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.ready(res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        services: expect.objectContaining({
          mongodb: expect.objectContaining({ status: 'up' }),
          redis: expect.objectContaining({ status: 'up' }),
          qdrant: expect.objectContaining({ status: 'up' }),
        }),
      }),
    );
  });
});
