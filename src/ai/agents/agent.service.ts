import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AgentGraphBuilder } from './graph/agent-graph.builder';
import { RunAgentDto } from './dto/run-agent.dto';
import {
  AiExecution,
  AiExecutionDocument,
} from '../../database/schemas/ai-execution.schema';
import { HumanMessage } from '@langchain/core/messages';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly agentGraphBuilder: AgentGraphBuilder,
    @InjectModel(AiExecution.name)
    private readonly aiExecutionModel: Model<AiExecutionDocument>,
  ) {}

  async runAgent(dto: RunAgentDto, requestId?: string): Promise<{
    requestId: string;
    answer: string;
    citations: any[];
    toolResults: any[];
    latencyMs: number;
  }> {
    const reqId = requestId || uuidv4();
    const startTime = Date.now();

    this.logger.log(
      `Running agent workflow for app ${dto.applicationId}, req ${reqId}`,
    );

    const compiledGraph = this.agentGraphBuilder.buildGraph(dto.tools);

    try {
      const initialState = {
        messages: [new HumanMessage(dto.query)],
        userId: dto.userId,
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        query: dto.query,
        systemInstruction: dto.systemInstruction,
        retrievedContext: '',
        citations: [],
        toolResults: [],
        finalResponse: '',
        metadata: {
          ...dto.metadata,
          requestId: reqId,
        },
        nextAction: 'classify' as const,
      };

      const finalState = await compiledGraph.invoke(initialState);
      const latencyMs = Date.now() - startTime;

      // Telemetry / Execution record
      await this.aiExecutionModel.create({
        requestId: reqId,
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        operation: 'agent_run',
        model: 'gemini-1.5-flash',
        latencyMs,
        cacheHit: false,
        retrievalCount: finalState.citations?.length || 0,
        status: 'success',
        metadata: {
          toolCount: finalState.toolResults?.length || 0,
        },
      });

      return {
        requestId: reqId,
        answer: finalState.finalResponse,
        citations: finalState.citations || [],
        toolResults: finalState.toolResults || [],
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      this.logger.error(`Agent run failed: ${err.message}`, err.stack);

      await this.aiExecutionModel.create({
        requestId: reqId,
        applicationId: dto.applicationId,
        tenantId: dto.tenantId,
        userId: dto.userId,
        operation: 'agent_run',
        model: 'gemini-1.5-flash',
        latencyMs,
        status: 'failure',
        error: err.message,
      });

      throw err;
    }
  }
}
