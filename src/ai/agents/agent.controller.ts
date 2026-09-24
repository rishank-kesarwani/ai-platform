import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { AgentService } from './agent.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { CorrelationId } from '../../common/decorators';

@ApiTags('Agents')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-api-key',
  description: 'Service-to-service authentication key',
  required: false,
})
@UseGuards(ServiceAuthGuard)
@Controller('ai/agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute a dynamic LangGraph agent workflow',
    description:
      'Runs a multi-step agent graph featuring classification, RAG retrieval, reasoning, dynamic tool calls, and validation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent workflow executed successfully',
  })
  async runAgent(
    @Body() dto: RunAgentDto,
    @CorrelationId() correlationId: string,
  ) {
    return this.agentService.runAgent(dto, correlationId);
  }
}
