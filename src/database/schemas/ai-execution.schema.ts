import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiExecutionDocument = AiExecution & Document;

@Schema({ timestamps: true, collection: 'ai_executions' })
export class AiExecution {
  @Prop({ required: true, unique: true })
  requestId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true, index: true })
  operation: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  latencyMs: number;

  @Prop({ type: Object, default: {} })
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  @Prop({ default: false })
  cacheHit: boolean;

  @Prop({ default: 0 })
  retrievalCount: number;

  @Prop({ required: true, enum: ['success', 'failure', 'cached'], default: 'success' })
  status: string;

  @Prop()
  error?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AiExecutionSchema = SchemaFactory.createForClass(AiExecution);

AiExecutionSchema.index({ applicationId: 1, tenantId: 1, createdAt: -1 });
