import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EvaluationSampleDto {
  @ApiProperty({ example: 'What is the check-in time for Hotel Shibuya?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'Check-in time is 3:00 PM.' })
  @IsString()
  @IsNotEmpty()
  expectedAnswer: string;

  @ApiPropertyOptional({ example: ['doc-hotel-guide-01'] })
  @IsArray()
  @IsOptional()
  expectedDocumentIds?: string[];
}

export class RunEvaluationDto {
  @ApiProperty({ example: 'ai-travel-planner' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ example: 'tenant-123' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ type: [EvaluationSampleDto] })
  @IsArray()
  @IsOptional()
  samples?: EvaluationSampleDto[];
}
