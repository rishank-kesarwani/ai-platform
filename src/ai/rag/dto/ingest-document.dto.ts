import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class IngestDocumentDto {
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

  @ApiProperty({ example: 'doc-hotel-guide-01', description: 'Unique document identifier within application' })
  @IsString()
  @IsNotEmpty()
  documentId: string;

  @ApiProperty({ example: 'guide', description: 'Document classification type (e.g. guide, policy, report)' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ example: 'https://hotels.com/guide/tokyo', description: 'Source URI or reference' })
  @IsString()
  @IsNotEmpty()
  source: string;

  @ApiProperty({ example: 'Tokyo Hotel & Travel Guide 2026', description: 'Document title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Tokyo is famous for vibrant neighborhoods such as Shibuya, Shinjuku, and Asakusa...', description: 'Full text content to be chunked and indexed' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: { city: 'Tokyo', category: 'travel' }, description: 'Additional structured metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ enum: ['public', 'tenant', 'user'], default: 'tenant', description: 'Access visibility scope' })
  @IsEnum(['public', 'tenant', 'user'])
  @IsOptional()
  visibility?: 'public' | 'tenant' | 'user' = 'tenant';
}
