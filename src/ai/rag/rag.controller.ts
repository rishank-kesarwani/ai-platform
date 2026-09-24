import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { RagService } from './rag.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { QueryRagDto } from './dto/query-rag.dto';

@ApiTags('RAG')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-api-key',
  description: 'Service-to-service authentication key',
  required: false,
})
@UseGuards(ServiceAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('documents')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Ingest or update document asynchronously',
    description:
      'Stores metadata and queues document for chunking, embedding generation, and vector indexing.',
  })
  @ApiResponse({
    status: 202,
    description: 'Document ingestion queued successfully',
  })
  async ingestDocument(@Body() dto: IngestDocumentDto) {
    return this.ragService.queueDocumentIngestion(dto);
  }

  @Delete('documents/:documentId')
  @ApiOperation({
    summary: 'Delete document and all indexed vector chunks',
    description:
      'Removes document metadata and all corresponding vector embeddings idempotently.',
  })
  @ApiResponse({
    status: 200,
    description: 'Document and vectors deleted successfully',
  })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Query('applicationId') applicationId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.ragService.deleteDocument(applicationId, tenantId, documentId);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query RAG vector index with multi-tenant filtering',
    description:
      'Embeds the query, applies strict multi-tenant isolation filters, and returns relevant chunks with citations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Context snippets and citations retrieved successfully',
  })
  async queryRag(@Body() dto: QueryRagDto) {
    return this.ragService.query(dto);
  }
}
