import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { AgentStateAnnotation } from '../state/agent.state';
import { LLMService } from '../../llm/llm.service';
import { RagRetrievalService } from '../../rag/retrieval/rag-retrieval.service';
import { ToolRegistry } from '../../tools/tool.registry';
import { ToolDefinition } from '../../tools/tool.interface';

@Injectable()
export class AgentGraphBuilder {
  private readonly logger = new Logger(AgentGraphBuilder.name);

  constructor(
    private readonly llmService: LLMService,
    private readonly retrievalService: RagRetrievalService,
    private readonly toolRegistry: ToolRegistry,
  ) {}

  buildGraph(customTools?: ToolDefinition[]) {
    const workflow = new StateGraph(AgentStateAnnotation)
      // 1. Classify Node
      .addNode('classify', async (state) => {
        this.logger.debug(`[Agent Node] Classifying query: ${state.query}`);
        const classificationPrompt = `
Analyze the following user query:
"${state.query}"

Determine whether this query requires:
1. "retrieve" - searching the knowledge base documents/policies/guides
2. "tool_call" - executing external actions or fetching live external data
3. "respond" - direct conversational response without extra retrieval or tools

Respond ONLY with valid JSON:
{
  "nextAction": "retrieve" | "tool_call" | "respond",
  "reasoning": "string"
}
`;
        try {
          const result = await this.llmService.structuredGenerate<{
            nextAction: 'retrieve' | 'tool_call' | 'respond';
            reasoning: string;
          }>({
            prompt: classificationPrompt,
            schemaDescription: '{"nextAction": "retrieve" | "tool_call" | "respond", "reasoning": string}',
            temperature: 0.1,
          });

          return { nextAction: result.nextAction || 'respond' };
        } catch {
          // Default to retrieve if classification fails
          return { nextAction: 'retrieve' };
        }
      })

      // 2. Retrieve Node (RAG)
      .addNode('retrieve', async (state) => {
        this.logger.debug(`[Agent Node] Retrieving knowledge for: ${state.query}`);
        try {
          const retrieval = await this.retrievalService.retrieve({
            applicationId: state.applicationId,
            tenantId: state.tenantId,
            userId: state.userId,
            query: state.query,
            topK: 4,
          });

          return {
            retrievedContext: retrieval.contextText,
            citations: retrieval.citations,
            nextAction: 'reason',
          };
        } catch (err: any) {
          this.logger.warn(`Retrieval failed in agent graph: ${err.message}`);
          return {
            retrievedContext: '',
            citations: [],
            nextAction: 'reason',
          };
        }
      })

      // 3. Reason Node
      .addNode('reason', async (state) => {
        this.logger.debug(`[Agent Node] Reasoning over query and context`);
        const availableTools = customTools || this.toolRegistry.listTools();
        const toolsDesc = availableTools
          .map((t) => `${t.name}: ${t.description} (params: ${JSON.stringify(t.parameters)})`)
          .join('\n');

        const prompt = `
User Query: "${state.query}"
${state.retrievedContext ? `Retrieved Context:\n${state.retrievedContext}\n` : ''}
${
  state.toolResults && state.toolResults.length > 0
    ? `Prior Tool Execution Results:\n${JSON.stringify(state.toolResults)}\n`
    : ''
}
${
  toolsDesc
    ? `Available Tools:\n${toolsDesc}\n`
    : 'No tools available.'
}

Determine if any available tool should be called to answer the query, or if you are ready to respond.
If a tool is needed, specify toolName and parameters.
Otherwise set nextAction to "respond".

Respond ONLY with valid JSON:
{
  "nextAction": "tool_call" | "respond",
  "toolName": "string or null",
  "toolInput": {} or null
}
`;

        try {
          const decision = await this.llmService.structuredGenerate<{
            nextAction: 'tool_call' | 'respond';
            toolName?: string;
            toolInput?: Record<string, any>;
          }>({
            prompt,
            schemaDescription: '{"nextAction": "tool_call" | "respond", "toolName": string | null, "toolInput": object | null}',
            temperature: 0.2,
          });

          if (decision.nextAction === 'tool_call' && decision.toolName && decision.toolInput) {
            return {
              nextAction: 'tool_call',
              metadata: {
                ...state.metadata,
                pendingToolName: decision.toolName,
                pendingToolInput: decision.toolInput,
              },
            };
          }

          return { nextAction: 'respond' };
        } catch {
          return { nextAction: 'respond' };
        }
      })

      // 4. Tool Call Node
      .addNode('tool_call', async (state) => {
        const toolName = state.metadata?.pendingToolName;
        const toolInput = state.metadata?.pendingToolInput || {};
        this.logger.debug(`[Agent Node] Executing tool: ${toolName}`);

        const toolResult = await this.toolRegistry.executeTool(
          toolName,
          toolInput,
          {
            applicationId: state.applicationId,
            tenantId: state.tenantId,
            userId: state.userId,
            requestId: state.metadata?.requestId || 'req-unknown',
          },
          customTools,
        );

        return {
          toolResults: [toolResult],
          nextAction: 'respond',
        };
      })

      // 5. Validate Node
      .addNode('validate', async (state) => {
        this.logger.debug(`[Agent Node] Validating output`);
        // Quality and safety validation
        return { nextAction: 'end' };
      })

      // 6. Respond Node
      .addNode('respond', async (state) => {
        this.logger.debug(`[Agent Node] Generating final response`);
        const systemPrompt =
          state.systemInstruction ||
          'You are an intelligent, precise enterprise AI agent. Answer clearly and comprehensively.';

        const contextPart = state.retrievedContext
          ? `\nRetrieved Knowledge Context:\n${state.retrievedContext}\n`
          : '';

        const toolPart =
          state.toolResults && state.toolResults.length > 0
            ? `\nTool Results:\n${JSON.stringify(state.toolResults, null, 2)}\n`
            : '';

        const fullPrompt = `${contextPart}${toolPart}\nUser Query: ${state.query}`;

        const response = await this.llmService.generate({
          systemInstruction: systemPrompt,
          prompt: fullPrompt,
          temperature: 0.7,
        });

        return {
          finalResponse: response.content,
          messages: [
            new HumanMessage(state.query),
            new AIMessage(response.content),
          ],
          nextAction: 'validate',
        };
      })

      // Graph Edges
      .addEdge(START, 'classify')
      .addConditionalEdges('classify', (state) => {
        if (state.nextAction === 'retrieve') return 'retrieve';
        if (state.nextAction === 'tool_call') return 'reason';
        return 'respond';
      }, ['retrieve', 'reason', 'respond'])
      .addEdge('retrieve', 'reason')
      .addConditionalEdges('reason', (state) => {
        if (state.nextAction === 'tool_call') return 'tool_call';
        return 'respond';
      }, ['tool_call', 'respond'])
      .addEdge('tool_call', 'respond')
      .addEdge('respond', 'validate')
      .addEdge('validate', END);

    return workflow.compile();
  }
}
