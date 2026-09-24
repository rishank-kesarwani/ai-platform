import { Injectable, Logger } from '@nestjs/common';
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionRecord,
} from './tool.interface';

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly globalTools: Map<string, ToolDefinition> = new Map();

  registerTool(tool: ToolDefinition): void {
    this.logger.log(`Registering tool: ${tool.name}`);
    this.globalTools.set(tool.name, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.globalTools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.globalTools.values());
  }

  async executeTool(
    toolName: string,
    input: Record<string, any>,
    context: ToolExecutionContext,
    customTools?: ToolDefinition[],
  ): Promise<ToolExecutionRecord> {
    const startTime = Date.now();
    const tool =
      customTools?.find((t) => t.name === toolName) ||
      this.globalTools.get(toolName);

    if (!tool) {
      return {
        toolName,
        input,
        output: null,
        error: `Tool "${toolName}" is not registered or supported.`,
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      this.logger.debug(
        `Executing tool "${toolName}" for app ${context.applicationId}, req ${context.requestId}`,
      );
      const output = await tool.execute(input, context);
      return {
        toolName,
        input,
        output,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.logger.error(`Error executing tool "${toolName}": ${err.message}`, err.stack);
      return {
        toolName,
        input,
        output: null,
        error: err.message || 'Execution failed',
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
