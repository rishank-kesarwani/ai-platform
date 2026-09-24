import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiChunkDocument = AiChunk & Document;

@Schema({ timestamps: true, collection: 'ai_chunks' })
export class AiChunk {
  @Prop({ required: true, index: true, unique: true })
  chunkId: string;

  @Prop({ required: true, index: true })
  documentId: string;

  @Prop({ required: true, index: true })
  documentVersion: number;

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true, index: true })
  documentType: string;

  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  text: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: true, enum: ['public', 'tenant', 'user'], default: 'tenant' })
  visibility: 'public' | 'tenant' | 'user';

  @Prop()
  embeddingId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AiChunkSchema = SchemaFactory.createForClass(AiChunk);

AiChunkSchema.index({ documentId: 1, documentVersion: 1 });
AiChunkSchema.index({ applicationId: 1, tenantId: 1 });
AiChunkSchema.index({ tenantId: 1, applicationId: 1, userId: 1 });
