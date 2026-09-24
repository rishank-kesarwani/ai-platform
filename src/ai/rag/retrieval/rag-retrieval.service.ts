import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../../embeddings/embedding.service';
import { VectorStoreFactory } from '../../vector-store/vector-store.factory';
import { VectorFilter } from '../../vector-store/vector-store.interface';
import { QueryRagDto } from '../dto/query-rag.dto';
import { Citation } from '../../../common/types';

export interface RetrievalResult {
  contextText: string;
  citations: Citation[];
  totalRetrieved: number;
}

@Injectable()
export class RagRetrievalService {
  private readonly logger = new Logger(RagRetrievalService.name);
  private readonly defaultTopK: number;
  private readonly defaultMinScore: number;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreFactory: VectorStoreFactory,
    private readonly configService: ConfigService,
  ) {
    this.defaultTopK = this.configService.get<number>('rag.topK') || 5;
    this.defaultMinScore = this.configService.get<number>('rag.minScore') || 0.5;
  }

  async retrieve(dto: QueryRagDto): Promise<RetrievalResult> {
    const vectorStore = this.vectorStoreFactory.getVectorStore();
    const topK = dto.topK ?? this.defaultTopK;
    const minScore = dto.minScore ?? this.defaultMinScore;

    // 1. Generate query embedding
    const queryVector = await this.embeddingService.embedQuery(dto.query);

    // 2. Build multi-tenant filter
    const filter: VectorFilter = {
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId,
      documentType: dto.documentType,
      additionalFilter: dto.filter,
    };

    // 3. Search vector store
    const results = await vectorStore.similaritySearchWithFilter(
      queryVector,
      filter,
      topK,
      minScore,
    );

    if (!results || results.length === 0) {
      return {
        contextText: '',
        citations: [],
        totalRetrieved: 0,
      };
    }

    // 4. Assemble context and citations
    const citations: Citation[] = [];
    const contextSnippets: string[] = [];

    for (const r of results) {
      const payload = r.payload;
      citations.push({
        documentId: payload.documentId,
        source: payload.source,
        chunkId: payload.chunkId,
        score: Math.round(r.score * 1000) / 1000,
        title: payload.title,
        documentType: payload.documentType,
      });

      contextSnippets.push(
        `[Source: ${payload.source} | DocId: ${payload.documentId} | Title: ${payload.title || 'Untitled'}]\n${payload.text}`,
      );
    }

    const contextText = contextSnippets.join('\n\n---\n\n');

    this.logger.debug(
      `Retrieved ${results.length} chunks for app ${dto.applicationId}, tenant ${dto.tenantId}`,
    );

    return {
      contextText,
      citations,
      totalRetrieved: results.length,
    };
  }
}
