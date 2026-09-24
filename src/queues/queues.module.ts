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
        const redisUrl = configService.get<string>('redis.url') || 'redis://localhost:6379';
        const url = new URL(redisUrl);
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
            username: url.username || undefined,
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
