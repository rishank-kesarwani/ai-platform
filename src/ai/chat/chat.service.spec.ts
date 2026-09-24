import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { ChatService } from './chat.service';
import { LLMService } from '../llm/llm.service';
import { RagRetrievalService } from '../rag/retrieval/rag-retrieval.service';
import { ConversationMemoryService } from '../memory/conversation-memory.service';
import { UserMemoryService } from '../memory/user-memory.service';
import { AiCacheService } from '../cache/ai-cache.service';
import { PromptService } from '../prompts/prompt.service';
import { AiExecution } from '../../database/schemas/ai-execution.schema';
import { QUEUES } from '../../common/constants';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockLLMService: any;
  let mockRagRetrievalService: any;
  let mockConversationMemory: any;
  let mockUserMemory: any;
  let mockCacheService: any;
  let mockPromptService: any;
  let mockExecutionModel: any;
  let mockMemoryQueue: any;

  beforeEach(async () => {
    mockLLMService = {
      generate: jest.fn().mockResolvedValue({
        content: 'Kyoto has Fushimi Inari and Kinkaku-ji.',
        model: 'gemini-1.5-flash',
        usage: { promptTokens: 40, completionTokens: 15, totalTokens: 55 },
      }),
    };

    mockRagRetrievalService = {
      retrieve: jest.fn().mockResolvedValue({
        contextText: 'Kyoto guide: Top shrines and temples.',
        citations: [
          {
            documentId: 'doc-kyoto-01',
            source: 'https://kyoto.travel',
            chunkId: 'chunk-1',
            score: 0.95,
          },
        ],
        totalRetrieved: 1,
      }),
    };

    mockConversationMemory = {
      getOrCreateConversation: jest.fn().mockResolvedValue({
        conversationId: 'conv-123',
      }),
      getConversationContext: jest.fn().mockResolvedValue({
        messages: [],
        summary: '',
      }),
      addMessage: jest.fn().mockResolvedValue({}),
    };

    mockUserMemory = {
      getUserMemories: jest.fn().mockResolvedValue([
        { key: 'budget', value: 'Moderate' },
      ]),
      formatMemoriesForPrompt: jest.fn().mockReturnValue('Known User Preferences:\n- budget: Moderate'),
    };

    mockCacheService = {
      generateKey: jest.fn().mockReturnValue('mock-cache-key'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    mockPromptService = {
      getTemplate: jest.fn().mockResolvedValue({
        systemPrompt: 'You are an AI assistant. {{userMemory}} {{retrievedContext}}',
        temperature: 0.7,
        maxTokens: 2048,
      }),
      renderPrompt: jest.fn().mockImplementation((tpl, vars) => 'Rendered prompt'),
    };

    mockExecutionModel = {
      create: jest.fn().mockResolvedValue({}),
    };

    mockMemoryQueue = {
      add: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: LLMService, useValue: mockLLMService },
        { provide: RagRetrievalService, useValue: mockRagRetrievalService },
        { provide: ConversationMemoryService, useValue: mockConversationMemory },
        { provide: UserMemoryService, useValue: mockUserMemory },
        { provide: AiCacheService, useValue: mockCacheService },
        { provide: PromptService, useValue: mockPromptService },
        { provide: getModelToken(AiExecution.name), useValue: mockExecutionModel },
        { provide: getQueueToken(QUEUES.MEMORY), useValue: mockMemoryQueue },
      ],
    }).compile();

    chatService = module.get<ChatService>(ChatService);
  });

  it('should process chat query, retrieve RAG, call LLM, and return citations', async () => {
    const result = await chatService.chat({
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-1',
      message: 'What should I see in Kyoto?',
      useRag: true,
      useMemory: true,
    });

    expect(result.answer).toContain('Kyoto has Fushimi Inari');
    expect(result.citations.length).toBe(1);
    expect(result.citations[0].documentId).toBe('doc-kyoto-01');
    expect(mockRagRetrievalService.retrieve).toHaveBeenCalled();
    expect(mockLLMService.generate).toHaveBeenCalled();
    expect(mockExecutionModel.create).toHaveBeenCalled();
    expect(mockMemoryQueue.add).toHaveBeenCalled();
  });
});
