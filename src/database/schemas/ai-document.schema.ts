import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiDocumentDocument = AiDocument & Document;

@Schema({ timestamps: true, collection: 'ai_documents' })
export class AiDocument {
  @Prop({ required: true, index: true })
  documentId: string;

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
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ required: true, enum: ['public', 'tenant', 'user'], default: 'tenant' })
  visibility: 'public' | 'tenant' | 'user';

  @Prop({ required: true, default: 1 })
  version: number;

  @Prop({ required: true, enum: ['queued', 'processing', 'indexed', 'failed', 'deleted'], default: 'queued' })
  status: string;

  @Prop({ default: 0 })
  chunkCount: number;

  @Prop()
  errorMessage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AiDocumentSchema = SchemaFactory.createForClass(AiDocument);

// Composite compound indexes as per specifications
AiDocumentSchema.index({ applicationId: 1, userId: 1, documentId: 1 });
AiDocumentSchema.index({ applicationId: 1, documentType: 1 });
AiDocumentSchema.index({ tenantId: 1, applicationId: 1 });
AiDocumentSchema.index({ documentId: 1, version: 1 });
