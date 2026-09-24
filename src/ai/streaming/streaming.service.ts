import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import { LLMService } from '../llm/llm.service';
import { RagRetrievalService } from '../rag/retrieval/rag-retrieval.service';
import { ConversationMemoryService } from '../memory/conversation-memory.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { PromptService } from '../prompts/prompt.service';
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { Citation } from '../../common/types';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly retrievalService: RagRetrievalService,
    private readonly conversationMemory: ConversationMemoryService,
    private readonly userMemory: UserMemoryService,
    private readonly promptService: PromptService,
  ) {}

  private sendEvent(res: Response, event: string, data: any) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  async streamChat(dto: ChatRequestDto, res: Response, correlationId?: string): Promise<void> {
    const requestId = correlationId || uuidv4();
    const startTime = Date.now();

    try {
      this.sendEvent(res, 'status', {
        step: 'initializing',
        requestId,
        message: 'Initializing stream pipeline',
      });

      // 1. Get or create conversation
      const conversation = await this.conversationMemory.getOrCreateConversation({
        conversationId: dto.conversationId,
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId || 'anonymous',
      });

      // 2. User Memory
      let formattedUserMemory = '';
      if (dto.useMemory && dto.userId) {
        this.sendEvent(res, 'status', {
          step: 'memory_lookup',
          message: 'Fetching user preferences',
        });
        const memories = await this.userMemory.getUserMemories(
          dto.applicationId,
          dto.tenantId,
          dto.userId,
        );
        formattedUserMemory = this.userMemory.formatMemoriesForPrompt(memories);
      }

      // 3. RAG Retrieval
      let retrievedContext = '';
      let citations: Citation[] = [];
      if (dto.useRag) {
        this.sendEvent(res, 'status', {
          step: 'retrieving_rag',
          message: 'Searching knowledge base',
        });
        const retrieval = await this.retrievalService.retrieve({
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          userId: dto.userId,
          query: dto.message,
          topK: 5,
        });
        retrievedContext = retrieval.contextText;
        citations = retrieval.citations;

        if (citations.length > 0) {
          this.sendEvent(res, 'retrieval', {
            count: citations.length,
            citations,
          });
        }
      }

      // 4. Prompt Assembly
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

      // 5. Conversation History Context
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

      this.sendEvent(res, 'status', {
        step: 'generating',
        message: 'Generating response stream',
      });

      // 6. Stream tokens
      let fullContent = '';
      const streamGenerator = this.llmService.stream({
        prompt: dto.message,
        messages: messagesToSend,
        temperature: dto.temperature ?? baseTemplate.temperature,
        maxOutputTokens: baseTemplate.maxTokens,
      });

      for await (const token of streamGenerator) {
        fullContent += token;
        this.sendEvent(res, 'token', { delta: token });
      }

      const latencyMs = Date.now() - startTime;

      // 7. Save conversation messages
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
        content: fullContent,
        citations,
        latencyMs,
      });

      // 8. Send completion event
      this.sendEvent(res, 'done', {
        requestId,
        conversationId: conversation.conversationId,
        latencyMs,
        citations,
      });

      res.end();
    } catch (err: any) {
      this.logger.error(`Error during stream execution: ${err.message}`, err.stack);
      this.sendEvent(res, 'error', {
        requestId,
        message: err.message || 'Stream generation failed',
      });
      res.end();
    }
  }
}
