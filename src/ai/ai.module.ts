import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../database/database.module';
import { QUEUES } from '../common/constants';
import { LLMService } from './llm/llm.service';
import { GeminiLLMProvider } from './llm/gemini.service';
import { EmbeddingService } from './embeddings/embedding.service';
import { GeminiEmbeddingService } from './embeddings/gemini-embedding.service';
import { RedisService } from './cache/redis.service';
import { AiCacheService } from './cache/ai-cache.service';
import { VectorStoreFactory } from './vector-store/vector-store.factory';
import { QdrantVectorStoreService } from './vector-store/qdrant-vector-store.service';
import { PromptRepository } from './prompts/prompt.repository';
import { PromptService } from './prompts/prompt.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';
import { UserMemoryService } from './memory/user-memory.service';
import { ToolRegistry } from './tools/tool.registry';
import { AgentGraphBuilder } from './agents/graph/agent-graph.builder';
import { AgentService } from './agents/agent.service';
import { AgentController } from './agents/agent.controller';
import { ChatService } from './chat/chat.service';
import { ChatController } from './chat/chat.controller';
import { StreamingService } from './streaming/streaming.service';
import { StreamingController } from './streaming/streaming.controller';
import { EvaluationService } from './evaluation/evaluation.service';
import { EvaluationController } from './evaluation/evaluation.controller';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [
    DatabaseModule,
    RagModule,
    BullModule.registerQueue(
      { name: QUEUES.RAG_INGESTION },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.MEMORY },
      { name: QUEUES.AI_GENERATION },
      { name: QUEUES.CLEANUP },
    ),
  ],
  controllers: [
    ChatController,
    StreamingController,
    AgentController,
    EvaluationController,
  ],
  providers: [
    LLMService,
    GeminiLLMProvider,
    EmbeddingService,
    GeminiEmbeddingService,
    RedisService,
    AiCacheService,
    VectorStoreFactory,
    QdrantVectorStoreService,
    PromptRepository,
    PromptService,
    ConversationMemoryService,
    UserMemoryService,
    ToolRegistry,
    AgentGraphBuilder,
    AgentService,
    ChatService,
    StreamingService,
    EvaluationService,
  ],
  exports: [
    LLMService,
    EmbeddingService,
    RedisService,
    AiCacheService,
    VectorStoreFactory,
    ConversationMemoryService,
    UserMemoryService,
    ToolRegistry,
    PromptService,
    AgentService,
    ChatService,
    StreamingService,
    EvaluationService,
    RagModule,
  ],
})
export class AiModule {}
