import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ToolDefinition } from '../../tools/tool.interface';

export class RunAgentDto {
  @ApiProperty({ example: 'ai-travel-planner', description: 'Application identifier' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 'tenant-123', description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ example: 'user-456', description: 'User identifier' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'Plan a 3-day itinerary in Kyoto considering my budget preference.', description: 'Agent goal or query' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ example: 'You are an expert itinerary planning agent.', description: 'System instruction overriding default' })
  @IsString()
  @IsOptional()
  systemInstruction?: string;

  @ApiPropertyOptional({ description: 'Application-provided custom tool definitions for this run' })
  @IsArray()
  @IsOptional()
  tools?: ToolDefinition[];

  @ApiPropertyOptional({ description: 'Additional execution metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
