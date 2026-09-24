import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, unique: true, index: true })
  messageId: string;

  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: ['user', 'assistant', 'system', 'tool'],
  })
  role: 'user' | 'assistant' | 'system' | 'tool';

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Object], default: [] })
  citations: Array<{
    documentId: string;
    source: string;
    chunkId: string;
    score: number;
    title?: string;
  }>;

  @Prop({ type: [Object], default: [] })
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, any>;
    result?: any;
  }>;

  @Prop({ type: Object, default: {} })
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  @Prop({ default: 0 })
  latencyMs?: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Spec requirement: messages index on conversationId + createdAt
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ tenantId: 1, applicationId: 1, userId: 1 });
