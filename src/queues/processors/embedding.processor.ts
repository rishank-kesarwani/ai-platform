import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../common/constants';
import { EmbeddingService } from '../../ai/embeddings/embedding.service';

export interface BatchEmbeddingJobData {
  texts: string[];
}

@Processor(QUEUES.EMBEDDING)
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly embeddingService: EmbeddingService) {
    super();
  }

  async process(job: Job<BatchEmbeddingJobData>): Promise<number[][]> {
    const { texts } = job.data;
    this.logger.log(`[BullMQ] Processing Batch Embedding Job ${job.id} with ${texts.length} texts`);

    try {
      const embeddings = await this.embeddingService.embedDocuments(texts);
      this.logger.log(`[BullMQ] Successfully processed embeddings for Job ${job.id}`);
      return embeddings;
    } catch (err: any) {
      this.logger.error(`[BullMQ] Failed embedding job ${job.id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
