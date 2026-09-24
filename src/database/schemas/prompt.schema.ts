import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PromptTemplateDocument = PromptTemplate & Document;

@Schema({ timestamps: true, collection: 'prompts' })
export class PromptTemplate {
  @Prop({ required: true, unique: true, index: true })
  promptId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  promptName: string;

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ required: true })
  systemPrompt: string;

  @Prop({ default: '' })
  userPromptTemplate: string;

  @Prop({ default: 0.7 })
  temperature: number;

  @Prop({ default: 2048 })
  maxTokens: number;

  @Prop({ type: [String], default: [] })
  inputVariables: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PromptTemplateSchema = SchemaFactory.createForClass(PromptTemplate);

PromptTemplateSchema.index(
  { applicationId: 1, promptName: 1, version: -1 },
  { unique: true },
);
PromptTemplateSchema.index({ applicationId: 1, promptName: 1, isActive: 1 });
