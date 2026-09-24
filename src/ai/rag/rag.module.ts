import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { QUEUES } from '../../common/constants';
import { RagIngestionService } from './ingestion/rag-ingestion.service';
import { RagRetrievalService } from './retrieval/rag-retrieval.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { VectorStoreFactory } from '../vector-store/vector-store.factory';
import { QdrantVectorStoreService } from '../vector-store/qdrant-vector-store.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { GeminiEmbeddingService } from '../embeddings/gemini-embedding.service';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({
      name: QUEUES.RAG_INGESTION,
    }),
  ],
  controllers: [RagController],
  providers: [
    RagIngestionService,
    RagRetrievalService,
    RagService,
    VectorStoreFactory,
    QdrantVectorStoreService,
    EmbeddingService,
    GeminiEmbeddingService,
  ],
  exports: [
    RagService,
    RagIngestionService,
    RagRetrievalService,
    VectorStoreFactory,
    QdrantVectorStoreService,
    EmbeddingService,
  ],
})
export class RagModule {}
