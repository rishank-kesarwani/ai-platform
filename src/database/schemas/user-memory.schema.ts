import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserMemoryDocument = UserMemory & Document;

@Schema({ timestamps: true, collection: 'user_memories' })
export class UserMemory {
  @Prop({ required: true, unique: true, index: true })
  memoryId: string;

  @Prop({ required: true, index: true })
  applicationId: string;

  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop({ default: 'preference', index: true })
  category: string;

  @Prop({ default: 1.0 })
  confidence: number;

  @Prop({ default: 'conversation' })
  source: string;

  @Prop({ default: false })
  vectorIndexed: boolean;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserMemorySchema = SchemaFactory.createForClass(UserMemory);

// Spec requirement: memories index on tenantId + applicationId + userId
UserMemorySchema.index({ tenantId: 1, applicationId: 1, userId: 1 });
UserMemorySchema.index({ tenantId: 1, applicationId: 1, userId: 1, key: 1 }, { unique: true });
