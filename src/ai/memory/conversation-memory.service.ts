import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  ConversationDocument,
} from '../../database/schemas/conversation.schema';
import { Message, MessageDocument } from '../../database/schemas/message.schema';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { Citation, TokenUsage } from '../../common/types';

export interface AddMessageParams {
  conversationId: string;
  applicationId: string;
  tenantId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  citations?: Citation[];
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, any>;
    result?: any;
  }>;
  usage?: TokenUsage;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class ConversationMemoryService {
  private readonly logger = new Logger(ConversationMemoryService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async createConversation(params: {
    conversationId?: string;
    applicationId: string;
    tenantId: string;
    userId: string;
    title?: string;
    metadata?: Record<string, any>;
  }): Promise<Conversation> {
    const conversationId = params.conversationId || uuidv4();
    const conversation = await this.conversationModel.create({
      conversationId,
      applicationId: params.applicationId,
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.title || 'New Conversation',
      summary: '',
      metadata: params.metadata || {},
      messageCount: 0,
      lastMessageAt: new Date(),
    });

    return conversation;
  }

  async getOrCreateConversation(params: {
    conversationId?: string;
    applicationId: string;
    tenantId: string;
    userId: string;
  }): Promise<ConversationDocument> {
    if (params.conversationId) {
      const conv = await this.conversationModel.findOne({
        conversationId: params.conversationId,
        applicationId: params.applicationId,
        tenantId: params.tenantId,
      });
      if (conv) return conv;
    }

    const newId = params.conversationId || uuidv4();
    return this.conversationModel.create({
      conversationId: newId,
      applicationId: params.applicationId,
      tenantId: params.tenantId,
      userId: params.userId,
      title: 'Conversation',
      summary: '',
      messageCount: 0,
      lastMessageAt: new Date(),
    });
  }

  async addMessage(params: AddMessageParams): Promise<Message> {
    const messageId = uuidv4();

    const message = await this.messageModel.create({
      messageId,
      conversationId: params.conversationId,
      applicationId: params.applicationId,
      tenantId: params.tenantId,
      userId: params.userId,
      role: params.role,
      content: params.content,
      citations: params.citations || [],
      toolCalls: params.toolCalls || [],
      usage: params.usage || {},
      latencyMs: params.latencyMs || 0,
      metadata: params.metadata || {},
    });

    await this.conversationModel.updateOne(
      {
        conversationId: params.conversationId,
        applicationId: params.applicationId,
        tenantId: params.tenantId,
      },
      {
        $inc: { messageCount: 1 },
        $set: { lastMessageAt: new Date() },
      },
    );

    return message;
  }

  async getConversationContext(
    conversationId: string,
    applicationId: string,
    tenantId: string,
    limit = 10,
  ): Promise<{ messages: BaseMessage[]; summary: string }> {
    const conversation = await this.conversationModel.findOne({
      conversationId,
      applicationId,
      tenantId,
    });

    if (!conversation) {
      return { messages: [], summary: '' };
    }

    const messages = await this.messageModel
      .find({
        conversationId,
        applicationId,
        tenantId,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    // Reorder oldest to newest
    const ordered = messages.reverse();

    const baseMessages: BaseMessage[] = [];
    if (conversation.summary) {
      baseMessages.push(
        new SystemMessage(`Prior Conversation Summary: ${conversation.summary}`),
      );
    }

    for (const msg of ordered) {
      if (msg.role === 'user') {
        baseMessages.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        baseMessages.push(new AIMessage(msg.content));
      } else if (msg.role === 'system') {
        baseMessages.push(new SystemMessage(msg.content));
      }
    }

    return {
      messages: baseMessages,
      summary: conversation.summary,
    };
  }

  async getConversation(
    conversationId: string,
    applicationId: string,
    tenantId: string,
    userId?: string,
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const query: any = { conversationId, applicationId, tenantId };
    if (userId) query.userId = userId;

    const conversation = await this.conversationModel.findOne(query);
    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const messages = await this.messageModel
      .find({ conversationId, applicationId, tenantId })
      .sort({ createdAt: 1 })
      .exec();

    return { conversation, messages };
  }

  async listConversations(
    applicationId: string,
    tenantId: string,
    userId: string,
    limit = 20,
    offset = 0,
  ): Promise<{ items: Conversation[]; total: number }> {
    const query = { applicationId, tenantId, userId };
    const [items, total] = await Promise.all([
      this.conversationModel
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.conversationModel.countDocuments(query),
    ]);

    return { items, total };
  }
}
