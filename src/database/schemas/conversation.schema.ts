import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ required: true, unique: true, index: true })
  conversationId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ default: 'New Conversation' })
  title: string;

  @Prop({ default: '' })
  summary: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: 0 })
  messageCount: number;

  @Prop({ default: () => new Date() })
  lastMessageAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ tenantId: 1, applicationId: 1, userId: 1 });
ConversationSchema.index({ applicationId: 1, userId: 1 });
ConversationSchema.index({ updatedAt: -1 });
