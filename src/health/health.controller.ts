import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators';
import { RedisService } from '../ai/cache/redis.service';
import { VectorStoreFactory } from '../ai/vector-store/vector-store.factory';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
    private readonly vectorStoreFactory: VectorStoreFactory,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic service health ping' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  ping() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'portfolio-ai-platform',
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Kubernetes/Docker liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is running' })
  live() {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe checking MongoDB, Redis, and Qdrant connectivity',
  })
  @ApiResponse({ status: 200, description: 'All dependent systems are reachable' })
  @ApiResponse({ status: 503, description: 'One or more dependent systems are down' })
  async ready(@Res() res: Response) {
    const checks: Record<string, { status: 'up' | 'down'; latencyMs?: number; error?: string }> = {};

    // 1. MongoDB Check
    const mongoStart = Date.now();
    try {
      const isMongoReady = this.mongoConnection.readyState === 1;
      checks.mongodb = {
        status: isMongoReady ? 'up' : 'down',
        latencyMs: Date.now() - mongoStart,
      };
    } catch (err: any) {
      checks.mongodb = {
        status: 'down',
        latencyMs: Date.now() - mongoStart,
        error: 'MongoDB connection failed',
      };
    }

    // 2. Redis Check
    const redisStart = Date.now();
    try {
      const redisPing = await this.redisService.ping();
      checks.redis = {
        status: redisPing === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - redisStart,
      };
    } catch (err: any) {
      checks.redis = {
        status: 'down',
        latencyMs: Date.now() - redisStart,
        error: 'Redis connection failed',
      };
    }

    // 3. Qdrant Check
    const qdrantStart = Date.now();
    try {
      const vectorStore = this.vectorStoreFactory.getVectorStore();
      const isQdrantReady = await vectorStore.ping();
      checks.qdrant = {
        status: isQdrantReady ? 'up' : 'down',
        latencyMs: Date.now() - qdrantStart,
      };
    } catch (err: any) {
      checks.qdrant = {
        status: 'down',
        latencyMs: Date.now() - qdrantStart,
        error: 'Qdrant connection failed',
      };
    }

    const isHealthy = Object.values(checks).every((c) => c.status === 'up');
    const statusCode = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json({
      status: isHealthy ? 'ready' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: checks,
    });
  }
}
