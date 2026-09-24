import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PromptTemplate,
  PromptTemplateDocument,
} from '../../database/schemas/prompt.schema';

@Injectable()
export class PromptRepository {
  constructor(
    @InjectModel(PromptTemplate.name)
    private readonly promptModel: Model<PromptTemplateDocument>,
  ) {}

  async findActive(
    applicationId: string,
    promptName: string,
  ): Promise<PromptTemplate | null> {
    return this.promptModel
      .findOne({
        applicationId,
        promptName,
        isActive: true,
      })
      .sort({ version: -1 })
      .exec();
  }

  async findByVersion(
    applicationId: string,
    promptName: string,
    version: number,
  ): Promise<PromptTemplate | null> {
    return this.promptModel
      .findOne({
        applicationId,
        promptName,
        version,
      })
      .exec();
  }

  async createOrUpdate(
    template: Partial<PromptTemplate>,
  ): Promise<PromptTemplate> {
    const existing = await this.promptModel
      .findOne({
        applicationId: template.applicationId,
        promptName: template.promptName,
      })
      .sort({ version: -1 })
      .exec();

    const version = template.version || (existing ? existing.version + 1 : 1);

    const doc = await this.promptModel.findOneAndUpdate(
      {
        applicationId: template.applicationId,
        promptName: template.promptName,
        version,
      },
      {
        $set: {
          ...template,
          version,
        },
      },
      { upsert: true, new: true },
    );

    return doc;
  }
}
