export interface ToolExecutionContext {
  applicationId: string;
  tenantId: string;
  userId?: string;
  requestId: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description?: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
  execute: (
    input: Record<string, any>,
    context: ToolExecutionContext,
  ) => Promise<any>;
}

export interface ToolExecutionRecord {
  toolName: string;
  input: Record<string, any>;
  output: any;
  error?: string;
  latencyMs: number;
}
