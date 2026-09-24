import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { RagIngestionService } from './rag-ingestion.service';
import { AiDocument } from '../../../database/schemas/ai-document.schema';
import { AiChunk } from '../../../database/schemas/ai-chunk.schema';
import { EmbeddingService } from '../../embeddings/embedding.service';
import { VectorStoreFactory } from '../../vector-store/vector-store.factory';

describe('RagIngestionService', () => {
  let service: RagIngestionService;
  let mockDocModel: any;
  let mockChunkModel: any;
  let mockEmbeddingService: any;
  let mockVectorStore: any;

  beforeEach(async () => {
    mockDocModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({ version: 1, documentId: 'doc-1' }),
      updateOne: jest.fn().mockResolvedValue({}),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    mockChunkModel = {
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    mockEmbeddingService = {
      embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    };

    mockVectorStore = {
      upsertDocuments: jest.fn().mockResolvedValue(undefined),
      deleteByDocumentId: jest.fn().mockResolvedValue(undefined),
      deleteByVersion: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagIngestionService,
        { provide: getModelToken(AiDocument.name), useValue: mockDocModel },
        { provide: getModelToken(AiChunk.name), useValue: mockChunkModel },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        {
          provide: VectorStoreFactory,
          useValue: { getVectorStore: () => mockVectorStore },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'rag.chunkSize') return 800;
              if (key === 'rag.chunkOverlap') return 150;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RagIngestionService>(RagIngestionService);
  });

  it('should chunk, embed, and store document in vector store and mongo', async () => {
    await service.processDocumentIngestion(
      {
        applicationId: 'ai-travel-planner',
        tenantId: 'tenant-1',
        documentId: 'doc-1',
        documentType: 'guide',
        source: 'https://hotels.com',
        title: 'Tokyo Guide',
        content: 'Tokyo is an incredible city with rich culture and history.',
      },
      1,
    );

    expect(mockEmbeddingService.embedDocuments).toHaveBeenCalled();
    expect(mockVectorStore.upsertDocuments).toHaveBeenCalled();
    expect(mockChunkModel.insertMany).toHaveBeenCalled();
    expect(mockDocModel.updateOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'indexed' }),
    );
  });

  it('should delete document and indexed chunks idempotently', async () => {
    const res = await service.deleteDocument('ai-travel-planner', 'tenant-1', 'doc-1');
    expect(res.deleted).toBe(true);
    expect(mockVectorStore.deleteByDocumentId).toHaveBeenCalledWith('doc-1', 'ai-travel-planner', 'tenant-1');
    expect(mockChunkModel.deleteMany).toHaveBeenCalled();
    expect(mockDocModel.deleteOne).toHaveBeenCalled();
  });
});
