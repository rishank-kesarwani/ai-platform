import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { AiDocument, AiDocumentDocument } from '../../../database/schemas/ai-document.schema';
import { AiChunk, AiChunkDocument } from '../../../database/schemas/ai-chunk.schema';
import { EmbeddingService } from '../../embeddings/embedding.service';
import { VectorStoreFactory } from '../../vector-store/vector-store.factory';
import { VectorDocument } from '../../vector-store/vector-store.interface';
import { RecursiveCharacterChunker } from '../chunking/recursive-character-chunker';
import { IngestDocumentDto } from '../dto/ingest-document.dto';

@Injectable()
export class RagIngestionService {
  private readonly logger = new Logger(RagIngestionService.name);
  private readonly chunker: RecursiveCharacterChunker;

  constructor(
    @InjectModel(AiDocument.name)
    private readonly aiDocumentModel: Model<AiDocumentDocument>,
    @InjectModel(AiChunk.name)
    private readonly aiChunkModel: Model<AiChunkDocument>,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreFactory: VectorStoreFactory,
    private readonly configService: ConfigService,
  ) {
    const chunkSize = this.configService.get<number>('rag.chunkSize') || 800;
    const chunkOverlap = this.configService.get<number>('rag.chunkOverlap') || 150;
    this.chunker = new RecursiveCharacterChunker(chunkSize, chunkOverlap);
  }

  async prepareAndStoreMetadata(
    dto: IngestDocumentDto,
  ): Promise<{ document: AiDocument; version: number }> {
    const existing = await this.aiDocumentModel.findOne({
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      documentId: dto.documentId,
    });

    const newVersion = existing ? existing.version + 1 : 1;

    const document = await this.aiDocumentModel.findOneAndUpdate(
      {
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        documentId: dto.documentId,
      },
      {
        $set: {
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          userId: dto.userId,
          documentId: dto.documentId,
          documentType: dto.documentType,
          source: dto.source,
          title: dto.title,
          content: dto.content,
          metadata: dto.metadata || {},
          visibility: dto.visibility || 'tenant',
          version: newVersion,
          status: 'queued',
        },
      },
      { upsert: true, new: true },
    );

    return { document, version: newVersion };
  }

  async processDocumentIngestion(dto: IngestDocumentDto, version: number): Promise<void> {
    const vectorStore = this.vectorStoreFactory.getVectorStore();
    this.logger.log(
      `Starting ingestion for doc ${dto.documentId} (v${version}) in app ${dto.applicationId}`,
    );

    try {
      await this.aiDocumentModel.updateOne(
        {
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          documentId: dto.documentId,
        },
        { status: 'processing' },
      );

      // 1. Chunk document
      const chunks = this.chunker.chunkText(dto.content);
      if (chunks.length === 0) {
        await this.aiDocumentModel.updateOne(
          {
            applicationId: dto.applicationId,
            tenantId: dto.tenantId,
            documentId: dto.documentId,
          },
          { status: 'indexed', chunkCount: 0 },
        );
        return;
      }

      // 2. Generate embeddings
      const texts = chunks.map((c) => c.text);
      const embeddings = await this.embeddingService.embedDocuments(texts);

      // 3. Build chunk documents and vector store payload
      const vectorDocuments: VectorDocument[] = [];
      const chunkEntities: Partial<AiChunk>[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const chunkId = `${dto.applicationId}:${dto.tenantId}:${dto.documentId}:v${version}:${chunk.chunkIndex}`;

        vectorDocuments.push({
          id: chunkId,
          vector: embedding,
          payload: {
            chunkId,
            documentId: dto.documentId,
            documentVersion: version,
            chunkIndex: chunk.chunkIndex,
            applicationId: dto.applicationId,
            tenantId: dto.tenantId,
            userId: dto.userId,
            documentType: dto.documentType,
            source: dto.source,
            title: dto.title,
            text: chunk.text,
            visibility: dto.visibility || 'tenant',
            metadata: dto.metadata || {},
          },
        });

        chunkEntities.push({
          chunkId,
          documentId: dto.documentId,
          documentVersion: version,
          chunkIndex: chunk.chunkIndex,
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          userId: dto.userId,
          documentType: dto.documentType,
          source: dto.source,
          text: chunk.text,
          metadata: dto.metadata || {},
          visibility: dto.visibility || 'tenant',
          embeddingId: chunkId,
        });
      }

      // 4. Invalidate prior version chunks from vector store and Mongo
      if (version > 1) {
        await vectorStore.deleteByVersion(
          dto.documentId,
          version - 1,
          dto.applicationId,
          dto.tenantId,
        );
        await this.aiChunkModel.deleteMany({
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          documentId: dto.documentId,
          documentVersion: { $lt: version },
        });
      }

      // 5. Save vector embeddings in VectorStore & metadata in Mongo
      await vectorStore.upsertDocuments(vectorDocuments);

      // Replace chunks for current version idempotently
      await this.aiChunkModel.deleteMany({
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        documentId: dto.documentId,
        documentVersion: version,
      });
      await this.aiChunkModel.insertMany(chunkEntities);

      // 6. Update document status
      await this.aiDocumentModel.updateOne(
        {
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          documentId: dto.documentId,
        },
        {
          status: 'indexed',
          chunkCount: chunks.length,
          errorMessage: null,
        },
      );

      this.logger.log(
        `Successfully indexed ${chunks.length} chunks for document ${dto.documentId} (v${version})`,
      );
    } catch (err: any) {
      this.logger.error(
        `Failed to process ingestion for doc ${dto.documentId}: ${err.message}`,
        err.stack,
      );
      await this.aiDocumentModel.updateOne(
        {
          applicationId: dto.applicationId,
          tenantId: dto.tenantId,
          documentId: dto.documentId,
        },
        {
          status: 'failed',
          errorMessage: err.message,
        },
      );
      throw err;
    }
  }

  async deleteDocument(
    applicationId: string,
    tenantId: string,
    documentId: string,
  ): Promise<{ deleted: boolean }> {
    const vectorStore = this.vectorStoreFactory.getVectorStore();

    // 1. Delete from Vector Store
    await vectorStore.deleteByDocumentId(documentId, applicationId, tenantId);

    // 2. Delete Chunks from MongoDB
    await this.aiChunkModel.deleteMany({
      applicationId,
      tenantId,
      documentId,
    });

    // 3. Mark or delete from AiDocument collection
    const result = await this.aiDocumentModel.deleteOne({
      applicationId,
      tenantId,
      documentId,
    });

    this.logger.log(
      `Deleted document ${documentId} for app ${applicationId} and tenant ${tenantId}`,
    );
    return { deleted: result.deletedCount > 0 };
  }
}
