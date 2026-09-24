import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../common/constants';
import { RagIngestionJobData } from '../../common/types';
import { RagIngestionService } from '../../ai/rag/ingestion/rag-ingestion.service';

@Processor(QUEUES.RAG_INGESTION)
export class RagIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(RagIngestionProcessor.name);

  constructor(private readonly ragIngestionService: RagIngestionService) {
    super();
  }

  async process(job: Job<RagIngestionJobData>): Promise<void> {
    const { data } = job;
    this.logger.log(
      `[BullMQ] Processing RAG Ingestion Job ${job.id} for doc ${data.documentId} (v${data.documentVersion})`,
    );

    try {
      await this.ragIngestionService.processDocumentIngestion(
        {
          applicationId: data.applicationId,
          tenantId: data.tenantId,
          userId: data.userId,
          documentId: data.documentId,
          documentType: data.documentType,
          source: data.source,
          title: data.title,
          content: data.content,
          metadata: data.metadata,
          visibility: data.visibility,
        },
        data.documentVersion,
      );
      this.logger.log(
        `[BullMQ] Completed RAG Ingestion Job ${job.id} for doc ${data.documentId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[BullMQ] Failed RAG Ingestion Job ${job.id} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts}): ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }
}
