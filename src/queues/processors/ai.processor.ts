import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../common/constants';
import { ChatService } from '../../ai/chat/chat.service';
import { ChatRequestDto } from '../../ai/chat/dto/chat-request.dto';

@Processor(QUEUES.AI_GENERATION)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(private readonly chatService: ChatService) {
    super();
  }

  async process(job: Job<ChatRequestDto>): Promise<any> {
    this.logger.log(`[BullMQ] Processing async AI generation job ${job.id}`);
    try {
      const result = await this.chatService.chat(job.data, `job-${job.id}`);
      this.logger.log(`[BullMQ] Completed async AI generation job ${job.id}`);
      return result;
    } catch (err: any) {
      this.logger.error(`[BullMQ] Failed AI generation job ${job.id}: ${err.message}`, err.stack);
      throw err;
    }
  }
}
