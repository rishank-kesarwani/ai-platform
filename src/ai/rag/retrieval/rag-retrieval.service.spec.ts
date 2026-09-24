import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RagRetrievalService } from './rag-retrieval.service';
import { EmbeddingService } from '../../embeddings/embedding.service';
import { VectorStoreFactory } from '../../vector-store/vector-store.factory';
import { VectorStore } from '../../vector-store/vector-store.interface';

describe('RagRetrievalService', () => {
  let retrievalService: RagRetrievalService;
  let mockVectorStore: Partial<VectorStore>;
  let mockEmbeddingService: Partial<EmbeddingService>;

  beforeEach(async () => {
    mockEmbeddingService = {
      embedQuery: jest.fn().mockResolvedValue(new Array(768).fill(0.1)),
    };

    mockVectorStore = {
      similaritySearchWithFilter: jest.fn().mockResolvedValue([
        {
          id: 'chunk-1',
          score: 0.92,
          payload: {
            chunkId: 'ai-travel-planner:tenant-1:doc-1:v1:0',
            documentId: 'doc-1',
            documentVersion: 1,
            chunkIndex: 0,
            applicationId: 'ai-travel-planner',
            tenantId: 'tenant-1',
            documentType: 'guide',
            source: 'https://hotels.com/tokyo',
            title: 'Tokyo Hotels',
            text: 'Shibuya Hotel is great for budget travelers.',
            visibility: 'tenant',
          },
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagRetrievalService,
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        {
          provide: VectorStoreFactory,
          useValue: {
            getVectorStore: () => mockVectorStore,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) => {
              if (k === 'rag.topK') return 5;
              if (k === 'rag.minScore') return 0.5;
              return null;
            }),
          },
        },
      ],
    }).compile();

    retrievalService = module.get<RagRetrievalService>(RagRetrievalService);
  });

  it('should embed query, apply filters, and return context with citations', async () => {
    const result = await retrievalService.retrieve({
      applicationId: 'ai-travel-planner',
      tenantId: 'tenant-1',
      userId: 'user-1',
      query: 'Where should I stay in Shibuya?',
      topK: 3,
    });

    expect(mockEmbeddingService.embedQuery).toHaveBeenCalledWith('Where should I stay in Shibuya?');
    expect(mockVectorStore.similaritySearchWithFilter).toHaveBeenCalled();
    expect(result.citations.length).toBe(1);
    expect(result.citations[0].documentId).toBe('doc-1');
    expect(result.citations[0].score).toBe(0.92);
    expect(result.contextText).toContain('Shibuya Hotel is great');
  });
});
