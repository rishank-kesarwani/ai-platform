import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ example: 'ai-travel-planner', description: 'Application identifier' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 'tenant-123', description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ example: 'user-456', description: 'User identifier for memory and private documents' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'conv-789', description: 'Conversation identifier (will be created if omitted)' })
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiProperty({ example: 'What are the top attractions in Kyoto for autumn?', description: 'User prompt or message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'You are an expert travel guide assistant.', description: 'Custom system instruction' })
  @IsString()
  @IsOptional()
  systemInstruction?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether to retrieve relevant RAG knowledge' })
  @IsBoolean()
  @IsOptional()
  useRag?: boolean = true;

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether to incorporate and update long-term user memory' })
  @IsBoolean()
  @IsOptional()
  useMemory?: boolean = true;

  @ApiPropertyOptional({ example: true, default: true, description: 'Whether response may be cached in Redis' })
  @IsBoolean()
  @IsOptional()
  cacheable?: boolean = true;

  @ApiPropertyOptional({ example: 0.7, default: 0.7, description: 'Model sampling temperature' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(2)
  temperature?: number = 0.7;

  @ApiPropertyOptional({ example: { source: 'mobile-app' }, description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
