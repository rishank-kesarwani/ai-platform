import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { QUEUES, JOBS } from '../../common/constants';
import { ChatRequestDto } from './dto/chat-request.dto';
import { ChatResponseDto, Citation, MemoryExtractionJobData } from '../../common/types';
import { LLMService } from '../llm/llm.service';
import { RagRetrievalService } from '../rag/retrieval/rag-retrieval.service';
import { ConversationMemoryService } from '../memory/conversation-memory.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { AiCacheService } from '../cache/ai-cache.service';
import { PromptService } from '../prompts/prompt.service';
import {
  AiExecution,
  AiExecutionDocument,
} from '../../database/schemas/ai-execution.schema';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly retrievalService: RagRetrievalService,
    private readonly conversationMemory: ConversationMemoryService,
    private readonly userMemory: UserMemoryService,
    private readonly cacheService: AiCacheService,
    private readonly promptService: PromptService,
    @InjectModel(AiExecution.name)
    private readonly executionModel: Model<AiExecutionDocument>,
    @InjectQueue(QUEUES.MEMORY)
    private readonly memoryQueue: Queue,
  ) {}

  async chat(dto: ChatRequestDto, correlationId?: string): Promise<ChatResponseDto> {
    const requestId = correlationId || uuidv4();
    const startTime = Date.now();

    // 1. Check Redis Semantic / Response Cache
    if (dto.cacheable) {
      const cacheKey = this.cacheService.generateKey({
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        input: dto.message,
        systemPrompt: dto.systemInstruction,
        temperature: dto.temperature,
      });

      const cachedResponse = await this.cacheService.get<ChatResponseDto>(cacheKey);
      if (cachedResponse) {
        this.logger.debug(`Cache HIT for chat request ${requestId}`);
        const response: ChatResponseDto = {
          ...cachedResponse,
          requestId,
          cached: true,
          latencyMs: Date.now() - startTime,
        };

        // Record cached execution
        await this.executionModel.create({
          requestId,
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          userId: dto.userId,
          operation: 'chat',
          model: cachedResponse.model,
          latencyMs: response.latencyMs,
          cacheHit: true,
          retrievalCount: cachedResponse.citations?.length || 0,
          status: 'cached',
        });

        return response;
      }
    }

    // 2. Retrieve or create Conversation
    const conversation = await this.conversationMemory.getOrCreateConversation({
      conversationId: dto.conversationId,
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId || 'anonymous',
    });

    // 3. User Memory Retrieval
    let formattedUserMemory = '';
    if (dto.useMemory && dto.userId) {
      const memories = await this.userMemory.getUserMemories(
        dto.applicationId,
        dto.tenantId,
        dto.userId,
      );
      formattedUserMemory = this.userMemory.formatMemoriesForPrompt(memories);
    }

    // 4. RAG Retrieval
    let retrievedContext = '';
    let citations: Citation[] = [];
    if (dto.useRag) {
      const retrieval = await this.retrievalService.retrieve({
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        query: dto.message,
        topK: 5,
      });
      retrievedContext = retrieval.contextText;
      citations = retrieval.citations;
    }

    // 5. Prompt Assembly
    const baseTemplate = await this.promptService.getTemplate(
      dto.applicationId,
      dto.useRag ? 'rag-qa' : 'default-chat',
    );

    const systemInstruction =
      dto.systemInstruction ||
      this.promptService.renderPrompt(baseTemplate.systemPrompt, {
        userMemory: formattedUserMemory,
        retrievedContext: retrievedContext
          ? `\nRetrieved Knowledge Context:\n${retrievedContext}\n`
          : '',
      });

    // 6. Conversation Window
    const { messages: historyMessages } =
      await this.conversationMemory.getConversationContext(
        conversation.conversationId,
        dto.applicationId,
        dto.tenantId,
        8,
      );

    const messagesToSend: BaseMessage[] = [
      new SystemMessage(systemInstruction),
      ...historyMessages,
      new HumanMessage(dto.message),
    ];

    // 7. Invoke Gemini LLM Provider
    const llmResponse = await this.llmService.generate({
      prompt: dto.message,
      messages: messagesToSend,
      temperature: dto.temperature ?? baseTemplate.temperature,
      maxOutputTokens: baseTemplate.maxTokens,
    });

    const latencyMs = Date.now() - startTime;

    // 8. Update Conversation Memory (User and Assistant messages)
    await this.conversationMemory.addMessage({
      conversationId: conversation.conversationId,
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId || 'anonymous',
      role: 'user',
      content: dto.message,
    });

    await this.conversationMemory.addMessage({
      conversationId: conversation.conversationId,
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId || 'anonymous',
      role: 'assistant',
      content: llmResponse.content,
      citations,
      usage: llmResponse.usage,
      latencyMs,
    });

    // 9. Enqueue Async User Memory Extraction if enabled
    if (dto.useMemory && dto.userId) {
      const jobData: MemoryExtractionJobData = {
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        conversationId: conversation.conversationId,
        userMessage: dto.message,
        assistantMessage: llmResponse.content,
      };

      await this.memoryQueue.add(JOBS.EXTRACT_USER_MEMORY, jobData, {
        attempts: 2,
        removeOnComplete: true,
      });
    }

    const response: ChatResponseDto = {
      requestId,
      conversationId: conversation.conversationId,
      answer: llmResponse.content,
      citations,
      usage: llmResponse.usage || {},
      model: llmResponse.model,
      latencyMs,
      cached: false,
    };

    // 10. Cache in Redis if cacheable
    if (dto.cacheable) {
      const cacheKey = this.cacheService.generateKey({
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        input: dto.message,
        systemPrompt: dto.systemInstruction,
        temperature: dto.temperature,
      });
      await this.cacheService.set(cacheKey, response);
    }

    // 11. Record Execution Telemetry
    await this.executionModel.create({
      requestId,
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId,
      operation: 'chat',
      model: llmResponse.model,
      latencyMs,
      tokenUsage: llmResponse.usage,
      cacheHit: false,
      retrievalCount: citations.length,
      status: 'success',
    });

    return response;
  }
}
