import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  UserMemory,
  UserMemoryDocument,
} from '../../database/schemas/user-memory.schema';

@Injectable()
export class UserMemoryService {
  private readonly logger = new Logger(UserMemoryService.name);

  constructor(
    @InjectModel(UserMemory.name)
    private readonly userMemoryModel: Model<UserMemoryDocument>,
  ) {}

  async saveMemory(params: {
    applicationId: string;
    tenantId: string;
    userId: string;
    key: string;
    value: string;
    category?: string;
    confidence?: number;
    source?: string;
    metadata?: Record<string, any>;
  }): Promise<UserMemory> {
    const memoryId = uuidv4();
    const updated = await this.userMemoryModel.findOneAndUpdate(
      {
        applicationId: params.applicationId,
        tenantId: params.tenantId,
        userId: params.userId,
        key: params.key.toLowerCase().trim(),
      },
      {
        $set: {
          memoryId,
          value: params.value,
          category: params.category || 'preference',
          confidence: params.confidence ?? 1.0,
          source: params.source || 'conversation',
          metadata: params.metadata || {},
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(
      `Saved user memory [${params.key}] for user ${params.userId} in app ${params.applicationId}`,
    );
    return updated;
  }

  async getUserMemories(
    applicationId: string,
    tenantId: string,
    userId: string,
    limit = 20,
  ): Promise<UserMemory[]> {
    return this.userMemoryModel
      .find({
        applicationId,
        tenantId,
        userId,
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
  }

  formatMemoriesForPrompt(memories: UserMemory[]): string {
    if (!memories || memories.length === 0) return '';
    const formatted = memories
      .map((m) => `- ${m.key}: ${m.value}`)
      .join('\n');
    return `Known User Preferences & Profile:\n${formatted}`;
  }
}
