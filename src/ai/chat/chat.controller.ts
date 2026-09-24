import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CorrelationId } from '../../common/decorators';

@ApiTags('Chat')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-api-key',
  description: 'Service-to-service authentication key',
  required: false,
})
@UseGuards(ServiceAuthGuard)
@Controller('ai/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchronous AI Chat with RAG, Memory, and Semantic Caching',
    description:
      'Processes a multi-tenant chat query with optional RAG document retrieval, long-term user memory injection, Redis caching, and full citations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response returned with citations and usage metrics',
  })
  async chat(
    @Body() dto: ChatRequestDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.chatService.chat(dto, correlationId);
  }
}
