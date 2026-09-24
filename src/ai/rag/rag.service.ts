import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOBS } from '../../common/constants';
import { RagIngestionService } from './ingestion/rag-ingestion.service';
import { RagRetrievalService, RetrievalResult } from './retrieval/rag-retrieval.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { QueryRagDto } from './dto/query-rag.dto';
import { RagIngestionJobData } from '../../common/types';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly ingestionService: RagIngestionService,
    private readonly retrievalService: RagRetrievalService,
    @InjectQueue(QUEUES.RAG_INGESTION)
    private readonly ragIngestionQueue: Queue,
  ) {}

  async queueDocumentIngestion(dto: IngestDocumentDto): Promise<{
    documentId: string;
    status: string;
    version: number;
    jobId: string;
  }> {
    // 1. Prepare and update MongoDB document metadata
    const { version } = await this.ingestionService.prepareAndStoreMetadata(dto);

    // 2. Deterministic idempotent job ID
    const jobId = `rag:${dto.applicationId}:${dto.tenantId}:${dto.documentId}:v${version}`;

    // 3. Enqueue to BullMQ
    const jobData: RagIngestionJobData = {
      applicationId: dto.applicationId,
      tenantId: dto.tenantId,
      userId: dto.userId,
      documentId: dto.documentId,
      documentVersion: version,
      documentType: dto.documentType,
      source: dto.source,
      title: dto.title,
      content: dto.content,
      metadata: dto.metadata,
      visibility: dto.visibility || 'tenant',
    };

    await this.ragIngestionQueue.add(JOBS.INGEST_DOCUMENT, jobData, {
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Enqueued document ingestion job ${jobId}`);

    return {
      documentId: dto.documentId,
      status: 'queued',
      version,
      jobId,
    };
  }

  async deleteDocument(
    applicationId: string,
    tenantId: string,
    documentId: string,
  ): Promise<{ documentId: string; status: string }> {
    await this.ingestionService.deleteDocument(applicationId, tenantId, documentId);
    return {
      documentId,
      status: 'deleted',
    };
  }

  async query(dto: QueryRagDto): Promise<RetrievalResult> {
    return this.retrievalService.retrieve(dto);
  }
}
