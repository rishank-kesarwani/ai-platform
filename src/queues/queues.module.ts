import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from '../common/constants';
import { AiModule } from '../ai/ai.module';
import { RagIngestionProcessor } from './processors/rag-ingestion.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { MemoryProcessor } from './processors/memory.processor';
import { AiProcessor } from './processors/ai.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('redis.url') || process.env.REDIS_URL;
        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const password = configService.get<string>('redis.password');
        const db = configService.get<number>('redis.db', 0);

        if (redisUrl && redisUrl.trim()) {
          try {
            const parsedUrl = new URL(redisUrl.trim());
            return {
              connection: {
                host: parsedUrl.hostname,
                port: parseInt(parsedUrl.port || '6379', 10),
                password: parsedUrl.password || undefined,
                username: parsedUrl.username || undefined,
                db:
                  parsedUrl.pathname && parsedUrl.pathname !== '/'
                    ? parseInt(parsedUrl.pathname.replace('/', '') || '0', 10)
                    : undefined,
                tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
                maxRetriesPerRequest: null,
              },
            };
          } catch {
            return {
              connection: {
                url: redisUrl.trim(),
                maxRetriesPerRequest: null,
              },
            };
          }
        }

        return {
          connection: {
            host,
            port,
            password: password || undefined,
            db,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUES.RAG_INGESTION },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.MEMORY },
      { name: QUEUES.AI_GENERATION },
      { name: QUEUES.CLEANUP },
    ),
    AiModule,
  ],
  providers: [
    RagIngestionProcessor,
    EmbeddingProcessor,
    MemoryProcessor,
    AiProcessor,
  ],
  exports: [BullModule],
})
export class QueuesModule {}
