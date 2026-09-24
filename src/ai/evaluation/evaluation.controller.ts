import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceAuthGuard } from '../../common/guards/service-auth.guard';
import { EvaluationService } from './evaluation.service';
import { RunEvaluationDto } from './dto/evaluation.dto';

@ApiTags('Evaluation')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-api-key',
  description: 'Service-to-service authentication key',
  required: false,
})
@UseGuards(ServiceAuthGuard)
@Controller('ai/evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run automated RAG quality evaluation suite',
    description:
      'Evaluates retrieval relevance, context relevance, answer relevance, citation correctness, and latency metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluation results and benchmark metrics returned',
  })
  async runEvaluation(@Body() dto: RunEvaluationDto) {
    return this.evaluationService.runSuite(dto);
  }
}
