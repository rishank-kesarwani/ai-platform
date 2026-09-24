import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v5 as uuidv5 } from 'uuid';
import {
  VectorDocument,
  VectorFilter,
  VectorSearchResult,
  VectorStore,
} from './vector-store.interface';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Standard DNS namespace

@Injectable()
export class QdrantVectorStoreService implements VectorStore, OnModuleInit {
  private readonly logger = new Logger(QdrantVectorStoreService.name);
  private client: QdrantClient;
  private readonly collectionName: string;
  private readonly vectorDimension: number;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('qdrant.url') || 'http://localhost:6333';
    const apiKey = this.configService.get<string>('qdrant.apiKey');
    this.collectionName =
      this.configService.get<string>('qdrant.collection') || 'ai_platform_documents';
    this.vectorDimension =
      this.configService.get<number>('gemini.embeddingDimension') || 768;

    this.client = new QdrantClient({
      url,
      apiKey: apiKey || undefined,
      checkCompatibility: false,
    });
  }

  async onModuleInit() {
    try {
      await this.ensureCollection();
    } catch (err: any) {
      this.logger.warn(`Could not initialize Qdrant collection on startup: ${err.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const collections = await this.client.getCollections();
      return Array.isArray(collections.collections);
    } catch (err: any) {
      return false;
    }
  }

  private toValidUuid(id: string): string {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    );
    if (isUuid) return id;
    return uuidv5(id, UUID_NAMESPACE);
  }

  private async ensureCollection(): Promise<void> {
    const exists = await this.client.collectionExists(this.collectionName);
    if (!exists.exists) {
      this.logger.log(
        `Creating Qdrant collection "${this.collectionName}" with dimension ${this.vectorDimension}`,
      );
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorDimension,
          distance: 'Cosine',
        },
      });

      // Create payload indexes for efficient multi-tenant retrieval
      const fields = [
        'applicationId',
        'tenantId',
        'userId',
        'documentId',
        'documentVersion',
        'documentType',
        'visibility',
      ];

      for (const field of fields) {
        try {
          await this.client.createPayloadIndex(this.collectionName, {
            field_name: field,
            field_schema: 'keyword',
          });
        } catch (e: any) {
          this.logger.warn(`Index for ${field} on ${this.collectionName}: ${e.message}`);
        }
      }
    }
  }

  async upsertDocuments(documents: VectorDocument[]): Promise<void> {
    if (!documents || documents.length === 0) return;
    await this.ensureCollection();

    const points = documents.map((doc) => ({
      id: this.toValidUuid(doc.id),
      vector: doc.vector,
      payload: doc.payload,
    }));

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    await this.ensureCollection();

    const points = ids.map((id) => this.toValidUuid(id));
    await this.client.delete(this.collectionName, {
      wait: true,
      points,
    });
  }

  async deleteByDocumentId(
    documentId: string,
    applicationId: string,
    tenantId: string,
  ): Promise<void> {
    await this.ensureCollection();

    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'applicationId', match: { value: applicationId } },
          { key: 'tenantId', match: { value: tenantId } },
          { key: 'documentId', match: { value: documentId } },
        ],
      },
    });
  }

  async deleteByVersion(
    documentId: string,
    version: number,
    applicationId: string,
    tenantId: string,
  ): Promise<void> {
    await this.ensureCollection();

    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'applicationId', match: { value: applicationId } },
          { key: 'tenantId', match: { value: tenantId } },
          { key: 'documentId', match: { value: documentId } },
          { key: 'documentVersion', match: { value: version } },
        ],
      },
    });
  }

  async similaritySearch(
    queryVector: number[],
    limit = 5,
  ): Promise<VectorSearchResult[]> {
    await this.ensureCollection();

    const response = await this.client.query(this.collectionName, {
      query: queryVector,
      limit,
      with_payload: true,
    });

    const points = (response as any).points || response || [];
    return points.map((r: any) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload as VectorDocument['payload'],
    }));
  }

  async similaritySearchWithFilter(
    queryVector: number[],
    filter: VectorFilter,
    limit = 5,
    minScore = 0.5,
  ): Promise<VectorSearchResult[]> {
    await this.ensureCollection();

    const mustConditions: any[] = [
      { key: 'applicationId', match: { value: filter.applicationId } },
      { key: 'tenantId', match: { value: filter.tenantId } },
    ];

    if (filter.documentType) {
      mustConditions.push({
        key: 'documentType',
        match: { value: filter.documentType },
      });
    }

    const shouldConditions: any[] = [
      { key: 'visibility', match: { value: 'public' } },
      { key: 'visibility', match: { value: 'tenant' } },
    ];

    if (filter.userId) {
      shouldConditions.push({
        must: [
          { key: 'visibility', match: { value: 'user' } },
          { key: 'userId', match: { value: filter.userId } },
        ],
      });
    }

    const qdrantFilter: any = {
      must: mustConditions,
      should: shouldConditions,
    };

    if (filter.additionalFilter) {
      for (const [key, value] of Object.entries(filter.additionalFilter)) {
        mustConditions.push({
          key: `metadata.${key}`,
          match: { value },
        });
      }
    }

    const response = await this.client.query(this.collectionName, {
      query: queryVector,
      filter: qdrantFilter,
      limit,
      score_threshold: minScore,
      with_payload: true,
    });

    const points = (response as any).points || response || [];
    return points.map((r: any) => ({
      id: String(r.id),
      score: r.score,
      payload: r.payload as VectorDocument['payload'],
    }));
  }
}
