import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryRagDto {
  @ApiProperty({ example: 'ai-travel-planner', description: 'Application identifier' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 'tenant-123', description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ example: 'user-456', description: 'User identifier for private user-scoped documents' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ example: 'Where are the best boutique hotels in Tokyo near Shibuya?', description: 'User search query' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ example: 'guide', description: 'Filter retrieval by document type' })
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Number of chunks to retrieve' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  topK?: number;

  @ApiPropertyOptional({ example: 0.5, default: 0.5, description: 'Minimum similarity score threshold' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({ example: { city: 'Tokyo' }, description: 'Additional metadata filter' })
  @IsObject()
  @IsOptional()
  filter?: Record<string, any>;
}
