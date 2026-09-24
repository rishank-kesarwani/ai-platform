import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiDocument, AiDocumentSchema } from './schemas/ai-document.schema';
import { AiChunk, AiChunkSchema } from './schemas/ai-chunk.schema';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { UserMemory, UserMemorySchema } from './schemas/user-memory.schema';
import { AiExecution, AiExecutionSchema } from './schemas/ai-execution.schema';
import { PromptTemplate, PromptTemplateSchema } from './schemas/prompt.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: AiDocument.name, schema: AiDocumentSchema },
      { name: AiChunk.name, schema: AiChunkSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: UserMemory.name, schema: UserMemorySchema },
      { name: AiExecution.name, schema: AiExecutionSchema },
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
