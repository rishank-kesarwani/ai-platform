import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../common/constants';
import { MemoryExtractionJobData } from '../../common/types';
import { UserMemoryService } from '../../ai/memory/user-memory.service';
import { LLMService } from '../../ai/llm/llm.service';

interface ExtractedMemory {
  key: string;
  value: string;
  category: string;
}

@Processor(QUEUES.MEMORY)
export class MemoryProcessor extends WorkerHost {
  private readonly logger = new Logger(MemoryProcessor.name);

  constructor(
    private readonly userMemoryService: UserMemoryService,
    private readonly llmService: LLMService,
  ) {
    super();
  }

  async process(job: Job<MemoryExtractionJobData>): Promise<void> {
    const { applicationId, tenantId, userId, userMessage, assistantMessage } = job.data;
    this.logger.log(
      `[BullMQ] Extracting long-term memory for user ${userId} in app ${applicationId}`,
    );

    const extractionPrompt = `
Analyze the following conversation turn between a user and an AI assistant.
Identify any clear user preferences, constraints, habits, or factual personal attributes.

User Message: "${userMessage}"
Assistant Response: "${assistantMessage}"

If there are user preferences or traits (e.g. dietary preference, budget tier, favorite genre, travel style, study habit), extract them.
If none are present, return an empty array.

Return ONLY a JSON object matching this schema:
{
  "memories": [
    {
      "key": "e.g. food_preference",
      "value": "e.g. Vegetarian",
      "category": "e.g. preference"
    }
  ]
}
`;

    try {
      const result = await this.llmService.structuredGenerate<{
        memories: ExtractedMemory[];
      }>({
        prompt: extractionPrompt,
        schemaDescription: '{"memories": [{"key": string, "value": string, "category": string}]}',
        temperature: 0.1,
      });

      if (result && Array.isArray(result.memories)) {
        for (const item of result.memories) {
          if (item.key && item.value) {
            await this.userMemoryService.saveMemory({
              applicationId,
              tenantId,
              userId,
              key: item.key,
              value: item.value,
              category: item.category || 'preference',
              source: 'conversation',
            });
          }
        }
      }

      this.logger.log(`[BullMQ] Successfully processed memories for user ${userId}`);
    } catch (err: any) {
      this.logger.warn(`[BullMQ] Memory extraction completed with notice: ${err.message}`);
    }
  }
}
