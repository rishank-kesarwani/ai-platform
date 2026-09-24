import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { StreamingService } from './streaming.service';
import { ChatRequestDto } from '../chat/dto/chat-request.dto';
import { CorrelationId } from '../../common/decorators';

@ApiTags('Streaming')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-api-key',
  description: 'Service-to-service authentication key',
  required: false,
})
@UseGuards(ServiceAuthGuard)
@Controller('ai/chat/stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Post()
  @ApiOperation({
    summary: 'Stream AI chat response via Server-Sent Events (SSE)',
    description:
      'Streams token deltas, pipeline status events, RAG citations, and completion metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server-Sent Event stream initiated',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'event: token\ndata: {"delta":"Hello"}\n\n',
        },
      },
    },
  })
  async streamChat(
    @Body() dto: ChatRequestDto,
    @Res() res: Response,
    @CorrelationId() correlationId: string,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    return this.streamingService.streamChat(dto, res, correlationId);
  }
}
